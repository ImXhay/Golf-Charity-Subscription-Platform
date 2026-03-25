import { Component, Input, OnInit, signal, computed } from '@angular/core';
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
  profileData = signal<any>(null);
  recentScores = signal<any[]>([]);
  availableCharities = signal<any[]>([]);
  selectedCharity = signal<any>(null);
  currentScore: number | null = null;
  statusMessage = signal('');
  isUpdatingSubscription = signal(false);
  subStatus = signal({ plan: 'Monthly', active: false, renewalDate: 'Calculating...' });
  drawStats = signal({ nextDraw: 'April 30, 2026', drawsEntered: 0 });
  winnings = signal({ totalWon: 0, paymentStatus: 'None' });
  totalEntries = computed(() => this.recentScores().length + 1);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    if (this.user) {
      this.profileData.set(await this.supabase.getProfile(this.user.id));
      this.recentScores.set(await this.supabase.getRecentScores(this.user.id));
      this.availableCharities.set(await this.supabase.getCharities());
    }
  }

  async saveScore() {
    if (!this.currentScore) return;
    const ok = await this.supabase.submitGolfScore(this.user.id, this.currentScore);
    this.statusMessage.set(ok ? '✅ Score Saved!' : '❌ Error (1-45 only)');
    if (ok) {
      this.currentScore = null;
      this.recentScores.set(await this.supabase.getRecentScores(this.user.id));
    }
  }

  async selectCharity(charity: any) {
    this.selectedCharity.set(charity);
  }
  async subscribeToPlatform() {
    this.isUpdatingSubscription.set(true);
    const stripePaymentLink = 'https://buy.stripe.com/test_7sY6oH8qs7gB3zX5rr5os00';

    window.location.href = stripePaymentLink;
  }
  async logout() {
    await this.supabase.logout();
  }
}
