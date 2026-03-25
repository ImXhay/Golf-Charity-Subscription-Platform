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

  constructor(private supabase: Supabase) {}

  ngOnInit() {
    this.loadScores();
  }

  async loadScores() {
    const scores = await this.supabase.getRecentScores(this.user.id);
    this.recentScores.set(scores);
  }

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
