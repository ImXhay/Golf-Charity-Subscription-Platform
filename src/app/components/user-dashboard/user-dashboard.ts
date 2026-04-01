import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit {
  user: any = null;

  profileData = signal<any>(null);
  recentScores = signal<any[]>([]);

  availableCharities = signal<any[]>([]);
  filteredCharities = computed(() => {
    const query = this.charitySearch().toLowerCase();
    return this.availableCharities().filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
    );
  });
  selectedCharity = signal<any>(null);

  currentScore: number | null = null;
  statusMessage = signal('');
  isUpdatingSubscription = signal(false);

  drawStats = signal({ nextDraw: 'April 30, 2026', drawsEntered: 0 });
  winnings = signal({ totalWon: 0, paymentStatus: 'None' });
  subStatus = signal({ plan: 'Monthly', active: false, renewalDate: '' });

  totalEntries = computed(() => this.recentScores().length);

  subscriptionPlan = signal<'Monthly' | 'Yearly'>('Monthly');
  charityPercentage = signal<number>(10);

  charitySearch = signal('');

  selectedFile: File | null = null;
  uploadStatus = signal('');
  isUploading = signal(false);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    const {
      data: { user },
    } = await this.supabase.client.auth.getUser();

    if (user?.id) {
      this.user = user;
      await this.refreshData();
    } else {
      window.location.href = '/login';
    }
  }

  async refreshData() {
    let profile = await this.supabase.getProfile(this.user.id);

    if (!profile) {
      await this.supabase.client.from('profiles').upsert([{
        id: this.user.id,
        email: this.user.email,
        is_subscribed: false,
        total_paid: 0,
      }]);
      profile = await this.supabase.getProfile(this.user.id);
    }

    if (profile) {
      this.profileData.set(profile);

      let calculatedRenewalDate = '';

      // Define the Day Month Year format
      const dateOptions: Intl.DateTimeFormatOptions = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };

      if (profile.is_subscribed) {
        if (profile.subscription_end_date) {
          const endDate = new Date(profile.subscription_end_date);
          
          // Apply the formatting options here
          calculatedRenewalDate = endDate.toLocaleDateString('en-GB', dateOptions);

          // Expiration Check
          if (new Date() > endDate) {
            await this.supabase.client.from('profiles').update({ is_subscribed: false }).eq('id', this.user.id);
            profile.is_subscribed = false;
            calculatedRenewalDate = 'Expired';
          }
        } else {
          calculatedRenewalDate = 'Pending...';
        }
      } else {
        calculatedRenewalDate = 'N/A (Not Subscribed)';
      }

      this.subStatus.set({
        plan: profile.subscription_plan || 'Monthly',
        active: profile.is_subscribed,
        renewalDate: calculatedRenewalDate,
      });

      this.recentScores.set(await this.supabase.getRecentScores(this.user.id));
      this.availableCharities.set(await this.supabase.getCharities());

      const latestClaim = await this.supabase.getUserLatestClaim(this.user.id);
      let currentPaymentStatus = 'None';

      const totalWon = profile.total_won || 0;
      const totalPaid = profile.total_paid || 0;

      if (totalWon > totalPaid) {
        if (latestClaim && latestClaim.status === 'Pending') {
          currentPaymentStatus = 'Pending';
        } else if (latestClaim && latestClaim.status === 'Rejected') {
          currentPaymentStatus = 'Rejected';
        } else {
          currentPaymentStatus = 'Action Required: Submit Proof';
        }
      } else if (totalWon > 0 && totalWon === totalPaid) {
        currentPaymentStatus = 'Paid';
      }

      this.winnings.set({
        totalWon: totalWon,
        paymentStatus: currentPaymentStatus,
      });
    } else {
      alert('System Error: Could not generate profile.');
      await this.logout();
    }
  }

  async saveScore() {
    if (!this.currentScore) return;
    const ok = await this.supabase.submitGolfScore(this.user.id, this.currentScore);
    this.statusMessage.set(ok ? '✅ Score Added!' : '❌ Please enter a number from 1-45');
    if (ok) {
      this.currentScore = null;
      await this.refreshData();
    }
  }

  async editScore(score: any) {
    const newScore = parseInt(
      prompt(`Edit score (currently ${score.score_value}):`, score.score_value) || '0',
    );
    if (newScore >= 1 && newScore <= 45) {
      if (await this.supabase.updateScore(score.id, newScore)) {
        this.statusMessage.set('✅ Score Updated!');
        await this.refreshData();
      }
    } else {
      alert('Score must be between 1 and 45.');
    }
  }

  async selectCharity(charity: any) {
    const ok = await this.supabase.saveCharitySelection(
      this.user.id,
      charity.id,
      this.charityPercentage(),
    );
    if (ok) {
      this.selectedCharity.set(charity);
      this.statusMessage.set(
        `✅ Charity updated to ${charity.name} at ${this.charityPercentage()}%`,
      );
      setTimeout(() => this.statusMessage.set(''), 3000);
    }
  }

  donateDirectly(charityName: string | undefined) {
    if (!charityName) {
      alert('Please select a charity from the grid to support first!');
      return;
    }
    window.location.href = 'https://buy.stripe.com/test_6oU00j0Y09oJdax8DD5os02';
  }

  async subscribeToPlatform() {
    this.isUpdatingSubscription.set(true);
    if (this.subscriptionPlan() === 'Yearly') {
      window.location.href = `https://buy.stripe.com/test_28EbJ18qsdEZ6M9f215os01?client_reference_id=${this.user.id}`;
    } else {
      window.location.href = `https://buy.stripe.com/test_7sY6oH8qs7gB3zX5rr5os00?client_reference_id=${this.user.id}`;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.selectedFile = file;
  }

  async submitProof() {
    if (!this.selectedFile || !this.user?.id) return;

    this.isUploading.set(true);
    this.uploadStatus.set('Uploading screenshot...');

    const uploadRes = await this.supabase.uploadProof(this.selectedFile, this.user.id);

    if (uploadRes.success && uploadRes.url) {
      const claimOk = await this.supabase.submitClaim(this.user.id, uploadRes.url);
      this.uploadStatus.set(
        claimOk
          ? '✅ Proof submitted successfully! Please wait while we review.'
          : '❌ Failed to register claim.',
      );
      if (claimOk) this.selectedFile = null;
      await this.refreshData();
    } else {
      this.uploadStatus.set('❌ Upload failed: ' + uploadRes.error);
    }

    this.isUploading.set(false);
  }

  async logout() {
    await this.supabase.logout();
  }
}