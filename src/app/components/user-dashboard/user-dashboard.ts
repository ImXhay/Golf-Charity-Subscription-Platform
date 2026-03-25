import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css'
})
export class UserDashboard implements OnInit {
  @Input() user: any;

  profileData = signal<any>(null);
  recentScores = signal<any[]>([]);
  availableCharities = signal<any[]>([]);
  selectedCharity = signal<any>(null);
  
  currentScore: number | null = null;
  statusMessage = signal('');
  isUpdatingSubscription = signal(false);

  // Template Signals
  drawStats = signal({ nextDraw: 'April 30, 2026', drawsEntered: 0 });
  winnings = signal({ totalWon: 0, paymentStatus: 'None' });
  subStatus = signal({ plan: 'Monthly', active: false, renewalDate: 'Calculating...' });
  
  totalEntries = computed(() => this.recentScores().length);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    if (this.user?.id) {
      await this.refreshData();
    }
  }

  async refreshData() {
    const profile = await this.supabase.getProfile(this.user.id);
    if (profile) {
      this.profileData.set(profile);
      this.subStatus.set({ 
        plan: 'Monthly', 
        active: profile.is_subscribed, 
        renewalDate: new Date(new Date(profile.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() 
      });
      this.recentScores.set(await this.supabase.getRecentScores(this.user.id));
      this.availableCharities.set(await this.supabase.getCharities());
    }
  }

  async saveScore() {
    if (!this.currentScore) return;
    const ok = await this.supabase.submitGolfScore(this.user.id, this.currentScore);
    this.statusMessage.set(ok ? '✅ Score Logged!' : '❌ Error (1-45 only)');
    if (ok) {
      this.currentScore = null;
      await this.refreshData();
    }
  }

  async selectCharity(charity: any) {
    const ok = await this.supabase.saveCharitySelection(this.user.id, charity.id);
    if (ok) this.selectedCharity.set(charity);
  }

  async subscribeToPlatform() {
    this.isUpdatingSubscription.set(true);
    window.location.href = 'https://buy.stripe.com/test_7sY6oH8qs7gB3zX5rr5os00';
  }

  async logout() {
    await this.supabase.logout();
  }
}