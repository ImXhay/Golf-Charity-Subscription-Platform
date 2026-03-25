import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  users = signal<any[]>([]);
  charities = signal<any[]>([]);
  loading = signal(true);
  isProcessing = signal(false);
  statusMsg = signal('');

  newName = '';
  newDesc = '';

  showWinnerModal = false;
  lastWinningNumbers: number[] = [];
  totalWinners = 0;
  winnerDetails: any = null;;

  draws = signal<any[]>([]);

  claims = signal<any[]>([]);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    await this.loadAllUsers();
    await this.loadCharities();
    await this.loadDrawHistory();
    await this.loadClaims();
  }
  async loadClaims() {
    const data = await this.supabase.getPendingClaims();
    this.claims.set(data || []);
  }

  async updateClaim(claimId: string, status: 'Paid' | 'Rejected') {
    await this.supabase.updateClaimStatus(claimId, status);
    await this.loadClaims();
  }

  async loadDrawHistory() {
    const data = await this.supabase.getLatestDraws();
    this.draws.set(data || []);
  }

  async loadAllUsers() {
    this.loading.set(true);
    const data = await this.supabase.getAllProfiles();
    this.users.set(data || []);
    this.loading.set(false);
  }

  async loadCharities() {
    const data = await this.supabase.getCharities();
    this.charities.set(data || []);
  }

 async runMonthlyDraw() {
    const confirmed = confirm(
      'Are you sure? This will execute the algorithmic draw for the current period.'
    );
    if (!confirmed) return;

    this.isProcessing.set(true);

    const result = await this.supabase.runMonthlyDraw();

    if (result.success) {
      this.winnerDetails = result.details;
      this.totalWinners = result.totalWinners || 0;
      this.lastWinningNumbers = result.winningNumbers || [];
      
      this.showWinnerModal = true;
      await this.loadDrawHistory();
    } else {
      alert('The Draw Engine encountered an error: ' + result.error);
    }

    this.isProcessing.set(false);
  }

  closeWinnerModal() {
    this.showWinnerModal = false;
  }

  async addNewCharity() {
    if (!this.newName || !this.newDesc) {
      this.statusMsg.set('❌ Please fill in both fields.');
      return;
    }

    this.isProcessing.set(true);
    this.statusMsg.set('Saving...');

    try {
      const success = await this.supabase.addCharity(this.newName, this.newDesc);

      if (success) {
        this.statusMsg.set('✅ Charity added successfully!');
        this.newName = '';
        this.newDesc = '';
        await this.loadCharities();
      } else {
        this.statusMsg.set('❌ Database rejected the charity.');
      }
    } catch (err) {
      this.statusMsg.set('❌ System error occurred.');
    } finally {
      this.isProcessing.set(false);
    }
  }
  async removeCharity(id: string, name: string) {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const success = await this.supabase.deleteCharity(id);
      if (success) {
        await this.loadCharities();
      } else {
        alert('Failed to delete. It might be linked to existing users.');
      }
    }
  }

  async logout() {
    await this.supabase.logout();
  }
}
