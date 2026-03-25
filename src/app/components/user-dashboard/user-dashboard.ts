import { Component, Input, signal, OnInit } from '@angular/core'; 
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

  statusMessage = signal('');
  currentScore: number | null = null;
  recentScores = signal<any[]>([]);

  availableCharities = signal<any[]>([]);
  selectedCharity = signal<any | null>(null);

  subStatus = signal({ plan: 'Monthly', active: true, renewalDate: 'April 25, 2026' });
  drawStats = signal({ drawsEntered: 3, nextDraw: 'April 30, 2026' });
  winnings = signal({ totalWon: 0, paymentStatus: 'No pending payouts' });
  pastDraws = signal<any[]>([]);

  constructor(private supabase: Supabase) {}

  ngOnInit() {
    this.loadScores();
    this.loadCharityData();
    this.loadDrawHistory();
  }


  async loadScores() {
    const scores = await this.supabase.getRecentScores(this.user.id);
    this.recentScores.set(scores);
  }

  async loadCharityData() {
    const charities: any = await this.supabase.getCharities(); 
    this.availableCharities.set(charities || []);

    const profile: any = await this.supabase.getProfile(this.user.id);
    if (profile && profile.selected_charity_id) {
      const matched = charities.find((c: any) => c.id === profile.selected_charity_id);
      if (matched) this.selectedCharity.set(matched);
    }
  }

  async loadDrawHistory() {
    const draws = await this.supabase.getLatestDraws();
    this.pastDraws.set(draws);
  }

  async selectCharity(charity: any) {
    const success = await this.supabase.saveCharitySelection(this.user.id, charity.id);
    if (success) {
      this.selectedCharity.set(charity); 
    } else {
      alert("Failed to save charity. Check console.");
    }
  }

  // Saves a new golf score
  async saveScore() {
    if (!this.currentScore || this.currentScore < 1 || this.currentScore > 45) {
      this.statusMessage.set('⚠ Score must be between 1 and 45!');
      return;
    }

    this.statusMessage.set('Saving to database...');

    const isSuccess = await this.supabase.submitGolfScore(this.user.id, this.currentScore);

    if (isSuccess) {
      this.statusMessage.set('✅ Score saved successfully!');
      this.currentScore = null;
      await this.loadScores();
    } else {
      this.statusMessage.set('❌ Error saving score.');
    }
  }

  logout() {
    window.location.reload();
  }
}