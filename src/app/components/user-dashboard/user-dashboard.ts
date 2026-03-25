import { Component, Input, signal, OnInit, computed } from '@angular/core';
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
  @Input() user: any;

  statusMessage = signal('');
  currentScore: number | null = null;
  recentScores = signal<any[]>([]);
  availableCharities = signal<any[]>([]);
  selectedCharity = signal<any | null>(null);
  profileData = signal<any | null>(null);
  isUpdatingSubscription = signal(false);
  pastDraws = signal<any[]>([]);

  subStatus = signal({ plan: 'Monthly', active: true, renewalDate: 'April 25, 2026' });
  drawStats = signal({ drawsEntered: 3, nextDraw: 'April 30, 2026' });
  winnings = signal({ totalWon: 0, paymentStatus: 'No pending payouts' });

  totalEntries = computed(() => {
    const scores = this.recentScores();

    return scores.reduce((sum, s) => sum + (s.score_value || 0), 1);
  });

  winOdds = computed(() => {
    const entries = this.totalEntries();
    if (entries <= 1) return '0.5';
    const odds = (entries / 500) * 100;
    return odds.toFixed(1);
  });

  selectedFile: File | null = null;
  isUploading = signal(false);
  uploadMsg = signal('');

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    if (this.user?.id) {
      await Promise.all([
        this.loadProfileData(),
        this.loadScores(),
        this.loadCharityData(),
        this.loadDrawHistory(),
      ]);
    } else {
      console.warn('User dashboard initialized without user data.');
    }
  }

  async loadProfileData() {
    const profile = await this.supabase.getProfile(this.user.id);
    if (profile) this.profileData.set(profile);
  }

  async loadScores() {
    const scores = await this.supabase.getRecentScores(this.user.id);
    this.recentScores.set(scores || []);
  }

  async loadCharityData() {
    const charities = await this.supabase.getCharities();
    this.availableCharities.set(charities || []);

    const profile = this.profileData();
    if (profile?.selected_charity_id) {
      const matched = charities.find((c: any) => c.id === profile.selected_charity_id);
      if (matched) this.selectedCharity.set(matched);
    }
  }

  async loadDrawHistory() {
    const draws = await this.supabase.getLatestDraws();
    this.pastDraws.set(draws || []);
  }

  async selectCharity(charity: any) {
    const success = await this.supabase.saveCharitySelection(this.user.id, charity.id);
    if (success) {
      this.selectedCharity.set(charity);
      this.profileData.update((p) => ({ ...p, selected_charity_id: charity.id }));
    } else {
      alert('Failed to save charity selection.');
    }
  }

  async subscribeToPlatform() {
    this.isUpdatingSubscription.set(true);
    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({ is_subscribed: true })
        .eq('id', this.user.id);

      if (error) throw error;

      window.location.href = 'https://buy.stripe.com/test_7sY6oH8qs7gB3zX5rr5os00';
    } catch (err) {
      console.error('Subscription update failed:', err);
      this.isUpdatingSubscription.set(false);
    }
  }

  async saveScore() {
    if (!this.profileData()?.is_subscribed) {
      this.statusMessage.set('🔒 Subscription required to submit scores.');
      return;
    }

    if (!this.currentScore || this.currentScore < 1 || this.currentScore > 45) {
      this.statusMessage.set('⚠ Score must be between 1 and 45!');
      return;
    }

    this.statusMessage.set('Saving to database...');

    try {
      const isSuccess = await this.supabase.submitGolfScore(this.user.id, this.currentScore);

      if (isSuccess) {
        this.statusMessage.set('✅ Score saved successfully!');
        this.currentScore = null;
        await this.loadScores(); 
      } else {
        this.statusMessage.set('❌ Error saving score. Please try again.');
      }
    } catch (err) {
      this.statusMessage.set('❌ System error occurred.');
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  async uploadProof() {
    if (!this.selectedFile) return;
    this.isUploading.set(true);
    this.uploadMsg.set('Uploading securely to Supabase...');

    const success = await this.supabase.submitWinnerProof(
      this.user.id,
      this.selectedFile,
      'March 2026 Draw',
    );

    if (success) {
      this.uploadMsg.set('✅ Proof submitted! Pending Admin Review.');
      this.selectedFile = null;
    } else {
      this.uploadMsg.set('❌ Upload failed. Please try again.');
    }
    this.isUploading.set(false);
  }

  scrollTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async logout() {
    await this.supabase.logout();
  }
}
