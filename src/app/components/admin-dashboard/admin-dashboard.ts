import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  users = signal<any[]>([]);
  loading = signal(true);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    await this.loadAllUsers();
  }

  async loadAllUsers() {
    this.loading.set(true);
    const data = await this.supabase.getAllProfiles();
    this.users.set(data || []);
    this.loading.set(false);
  }

  async runMonthlyDraw() {
    const confirmed = confirm(
      'Are you sure? This will execute the algorithmic draw for the current period.',
    );
    if (!confirmed) return;

    this.loading.set(true);
    const result = await this.supabase.runMonthlyDraw();

    if (result.success) {
      alert(
        `Success! Winning Numbers: ${result.winningNumbers?.join(', ')}. We found ${result.winnerCount} winners!`,
      );
    } else {
      alert('The Draw Engine encountered an error. Check console.');
    }
    this.loading.set(false);
  }
}
