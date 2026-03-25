import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  users = signal<any[]>([]);
  charities = signal<any[]>([]);
  claims = signal<any[]>([]);
  draws = signal<any[]>([]);
  
  isProcessing = signal(false);
  statusMsg = signal('');
  newName = ''; newDesc = '';
  
  showWinnerModal = false;
  totalWinners = 0;
  totalPool = 0;
  rolloverAmount = 0;
  lastWinningNumbers: number[] = [];
  winnerDetails: any = null;

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.users.set(await this.supabase.getAllProfiles());
    this.charities.set(await this.supabase.getCharities());
    this.claims.set(await this.supabase.getPendingClaims());
    this.draws.set(await this.supabase.getLatestDraws());
  }

  async runMonthlyDraw() {
    if (!confirm('Execute the monthly draw?')) return;
    this.isProcessing.set(true);
    
    try {
      const res = await this.supabase.runMonthlyDraw();
      if (res.success) {
        this.winnerDetails = res.details;
        this.totalWinners = res.totalWinners;
        this.totalPool = res.totalPool;
        this.rolloverAmount = res.rolloverAmount;
        this.lastWinningNumbers = res.winningNumbers;
        this.showWinnerModal = true;
        await this.loadData();
      } else {
        alert('Error: ' + res.error);
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  async updateClaim(id: string, status: string) {
    if (await this.supabase.updateClaimStatus(id, status)) {
      await this.loadData();
    }
  }

  async addNewCharity() {
    if (await this.supabase.addCharity(this.newName, this.newDesc)) {
      this.newName = ''; this.newDesc = '';
      await this.loadData();
    }
  }

  async removeCharity(id: string, name: string) {
    if (confirm(`Delete ${name}?`)) {
      await this.supabase.deleteCharity(id);
      await this.loadData();
    }
  }

  closeWinnerModal() { this.showWinnerModal = false; }
  async logout() { await this.supabase.logout(); }
}