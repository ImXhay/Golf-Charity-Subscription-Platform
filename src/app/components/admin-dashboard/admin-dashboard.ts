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
  claims = signal<any[]>([]);
  draws = signal<any[]>([]);

  isProcessing = signal(false);
  statusMsg = signal('');

  newName = '';
  newDesc = '';

  showWinnerModal = false;
  totalWinners = 0;
  totalPool = 0;
  lastWinningNumbers: number[] = [];
  winnerDetails: any = null;

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    await this.loadInitialData();
  }

  async loadInitialData() {
    this.users.set(await this.supabase.getAllProfiles());
    this.charities.set(await this.supabase.getCharities());
    this.claims.set(await this.supabase.getPendingClaims());
    this.draws.set(await this.supabase.getLatestDraws());
  }

  async runMonthlyDraw() {
    const confirmed = confirm('Execute the monthly draw?');
    if (!confirmed) return;

    this.isProcessing.set(true);
    try {
      const result = await this.supabase.runMonthlyDraw();
      if (result.success) {
        this.winnerDetails = result.details;
        this.totalWinners = result.totalWinners;
        this.totalPool = result.totalPool;
        this.lastWinningNumbers = result.winningNumbers;
        this.showWinnerModal = true;
      } else {
        alert('Draw Engine Error: ' + (result?.error || 'Unknown failure'));
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  async updateClaim(claimId: string, status: 'Paid' | 'Rejected') {
    const success = await this.supabase.updateClaimStatus(claimId, status);
    if (success) {
      await this.loadClaims();
    }
  }

  async loadClaims() {
    this.claims.set(await this.supabase.getPendingClaims());
  }

  async addNewCharity() {
    if (!this.newName || !this.newDesc) return;
    this.isProcessing.set(true);
    const success = await this.supabase.addCharity(this.newName, this.newDesc);
    if (success) {
      this.newName = '';
      this.newDesc = '';
      this.charities.set(await this.supabase.getCharities());
    }
    this.isProcessing.set(false);
  }

  async removeCharity(id: string, name: string) {
    if (confirm(`Delete ${name}?`)) {
      await this.supabase.deleteCharity(id);
      this.charities.set(await this.supabase.getCharities());
    }
  }

  closeWinnerModal() {
    this.showWinnerModal = false;
  }

  async logout() {
    await this.supabase.logout();
  }
}
