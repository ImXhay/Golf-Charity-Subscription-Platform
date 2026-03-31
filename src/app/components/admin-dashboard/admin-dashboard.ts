import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';
import { AdminState } from '../../services/admin-state';
;

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
  drawType: 'random' | 'algorithmic' = 'random';

  isProcessing = signal(false);
  statusMsg = signal('');
  
  selectedCharityFile: File | null = null;
  
  showWinnerModal = false;
  totalWinners = 0;
  totalPool = 0;
  rolloverAmount = 0;
  lastWinningNumbers: number[] = [];
  winnerDetails: any = null;

  showScoreModal = false;
  editingUser: any = null;
  editingUserScores: any[] = [];

  charityTotals: { name: string; amount: number; donors: number }[] = [];

  constructor(
    private supabase: Supabase,
    public adminState: AdminState
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.users.set(await this.supabase.getAllProfiles());
    this.charities.set(await this.supabase.getCharities());
    this.claims.set(await this.supabase.getPendingClaims());
    this.draws.set(await this.supabase.getLatestDraws());
    this.calculateCharityContributions();
  }

  calculateCharityContributions() {
    const totals: Record<string, { name: string; amount: number; donors: number }> = {};
    const MONTHLY_FEE = 10;
    const YEARLY_FEE_MONTHLY_EQUIVALENT = 8;

    this.users().forEach((user) => {
      if (user.is_subscribed && user.charities?.name) {
        const charityName = user.charities.name;
        const percentage = user.charity_percentage || 10;
        const baseFee = user.subscription_plan === 'Yearly' ? YEARLY_FEE_MONTHLY_EQUIVALENT : MONTHLY_FEE;
        const contribution = baseFee * (percentage / 100);

        if (!totals[charityName]) totals[charityName] = { name: charityName, amount: 0, donors: 0 };
        totals[charityName].amount += contribution;
        totals[charityName].donors += 1;
      }
    });

    this.charityTotals = Object.values(totals).sort((a, b) => b.amount - a.amount);
  }

  async runDraw(isSimulation: boolean) {
    const confirmMessage = isSimulation ? `Run a ${this.drawType.toUpperCase()} simulation?` : `Execute OFFICIAL ${this.drawType.toUpperCase()} draw?`;
    if (!confirm(confirmMessage)) return;

    this.isProcessing.set(true);
    try {
      const res = await this.supabase.runMonthlyDraw(isSimulation, this.drawType);

      if (res.success) {
        this.winnerDetails = res.details;
        this.totalWinners = res.totalWinners;
        this.totalPool = res.totalPool;
        this.rolloverAmount = res.rolloverAmount;
        this.lastWinningNumbers = res.winningNumbers;
        this.showWinnerModal = true;
        if (!isSimulation) await this.loadData();
      } else {
        alert('Draw failed: ' + res.error);
      }
    } catch (error) {
      console.error('Error running draw:', error);
      alert('An unexpected error occurred during the draw.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async updateClaim(id: string, status: string) {
    if (await this.supabase.updateClaimStatus(id, status)) {
      await this.loadData();
    }
  }

  onCharityFileSelected(event: any) {
    this.selectedCharityFile = event.target.files[0];
  }

  async addNewCharity() {
    this.isProcessing.set(true);
    let imageUrl = null;

    if (this.selectedCharityFile) {
      const uploadRes = await this.supabase.uploadCharityImage(this.selectedCharityFile);
      if (uploadRes.success) imageUrl = uploadRes.url;
    }

    if (await this.supabase.addCharity(this.adminState.newCharityName, this.adminState.newCharityDesc, imageUrl)) {
      this.adminState.newCharityName = '';
      this.adminState.newCharityDesc = '';
      this.selectedCharityFile = null;
      this.statusMsg.set('✅ Charity added successfully!');
      setTimeout(() => this.statusMsg.set(''), 3000);
      await this.loadData();
    }
    this.isProcessing.set(false);
  }

  async editCharity(c: any) {
    const newName = prompt('Edit Charity Name:', c.name) || c.name;
    const newDesc = prompt('Edit Charity Description:', c.description) || c.description;
    if (await this.supabase.adminUpdateCharity(c.id, newName, newDesc)) await this.loadData();
  }

  async removeCharity(id: string, name: string) {
    if (confirm(`Delete ${name}?`)) {
      await this.supabase.deleteCharity(id);
      await this.loadData();
    }
  }

  async toggleSubscription(u: any) {
    const newStatus = !u.is_subscribed;
    if (confirm(`Change ${u.email} subscription to ${newStatus ? 'Active' : 'Inactive'}?`)) {
      if (await this.supabase.adminUpdateProfile(u.id, newStatus)) await this.loadData();
    }
  }

  async openUserScores(user: any) {
    this.editingUser = user;
    this.editingUserScores = await this.supabase.getRecentScores(user.id);
    this.showScoreModal = true;
  }

  closeScoreModal() {
    this.showScoreModal = false;
    this.editingUser = null;
  }

  async saveAdminScore(score: any) {
    const newScore = parseInt(prompt(`Edit score for ${this.editingUser.email} (currently ${score.score_value}):`, score.score_value) || '0');
    if (newScore >= 1 && newScore <= 45) {
      if (await this.supabase.updateScore(score.id, newScore)) {
        this.editingUserScores = await this.supabase.getRecentScores(this.editingUser.id);
      }
    } else {
      alert('Invalid score. Must be between 1 and 45.');
    }
  }
  
  closeWinnerModal() {
    this.showWinnerModal = false;
  }

  async logout() {
    await this.supabase.logout();
  }
}