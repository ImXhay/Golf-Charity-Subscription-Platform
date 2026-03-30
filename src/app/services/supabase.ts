import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class Supabase {
  public client: SupabaseClient;

  constructor() {
    this.client = createClient(
      'https://touymrieujxaowbvzdlo.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXltcmlldWp4YW93YnZ6ZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzA1NDQsImV4cCI6MjA4OTk0NjU0NH0.9QRu2eR9QWrV393gJLVsW5LAnc4-JVttUQe_HPArpnc',
    );
  }

  async signIn(email: string, pass: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password: pass });
    return { success: !error, user: data?.user, error: error?.message };
  }

  async signUp(email: string, pass: string, charityId: string) {
    const { data, error } = await this.client.auth.signUp({ email, password: pass });
    if (error || !data.user) return { success: false, error: error?.message };
    const { error: pErr } = await this.client
      .from('profiles')
      .insert([{ id: data.user.id, email, selected_charity_id: charityId, is_subscribed: false }]);
    return { success: !pErr, user: data.user, error: pErr?.message };
  }

  async getProfile(id: string) {
    return (await this.client.from('profiles').select('*').eq('id', id).single()).data;
  }

  async getAllProfiles() {
    return (await this.client.from('profiles').select('*, charities(name)')).data || [];
  }

  async logout() {
    await this.client.auth.signOut();
    window.location.href = '/';
  }

  async getCharities() {
    return (await this.client.from('charities').select('*')).data || [];
  }

  async addCharity(name: string, description: string) {
    const { error } = await this.client.from('charities').insert([{ name, description }]);
    return !error;
  }

  async deleteCharity(id: string) {
    const { error } = await this.client.from('charities').delete().eq('id', id);
    return !error;
  }

  async saveCharitySelection(userId: string, charityId: string, percentage: number) {
    const { error } = await this.client
      .from('profiles')
      .update({
        selected_charity_id: charityId,
        charity_percentage: percentage,
      })
      .eq('id', userId);
    return !error;
  }

  async getCharityById(id: string) {
    const { data, error } = await this.client.from('charities').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching charity:', error);
      return null;
    }
    return data;
  }

  async submitGolfScore(userId: string, score: number) {
    if (score < 1 || score > 45) return false;

    const { data: scores } = await this.client
      .from('scores')
      .select('id')
      .eq('profile_id', userId)
      .order('created_at', { ascending: true });
    if (scores && scores.length >= 5) {
      await this.client.from('scores').delete().eq('id', scores[0].id);
    }

    const { error } = await this.client
      .from('scores')
      .insert([{ profile_id: userId, score_value: score }]);
    return !error;
  }

  async runMonthlyDraw(isSimulation: boolean = false): Promise<any> {
    try {
      const { data: subs } = await this.client
        .from('profiles')
        .select('id, email')
        .eq('is_subscribed', true);
      const winNums = Array.from({ length: 5 }, () => Math.floor(Math.random() * 45) + 1);
      const pool = (subs?.length || 0) * 10;

      const winners: { tier5: string[]; tier4: string[]; tier3: string[] } = {
        tier5: [],
        tier4: [],
        tier3: [],
      };

      if (subs) {
        for (const sub of subs) {
          const { data: scores } = await this.client
            .from('scores')
            .select('score_value')
            .eq('profile_id', sub.id);
          if (scores) {
            const userScores = scores.map((s) => s.score_value);
            const matchCount = userScores.filter((s) => winNums.includes(s)).length;

            if (matchCount === 5) winners.tier5.push(sub.email);
            else if (matchCount === 4) winners.tier4.push(sub.email);
            else if (matchCount === 3) winners.tier3.push(sub.email);
          }
        }
      }

      let rollover = 0;
      if (winners.tier5.length === 0) rollover = pool * 0.4;

      if (!isSimulation) {
        const { error } = await this.client.from('monthly_draws').insert([
          {
            winning_numbers: winNums,
            total_pool: pool,
            rollover_amount: rollover,
          },
        ]);
        if (error) throw error;
      }

      return {
        success: true,
        isSimulation,
        winningNumbers: winNums,
        totalPool: pool,
        totalWinners: winners.tier5.length + winners.tier4.length + winners.tier3.length,
        rolloverAmount: rollover,
        details: winners,
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getRecentScores(userId: string) {
    return (
      (
        await this.client
          .from('scores')
          .select('*')
          .eq('profile_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
      ).data || []
    );
  }

  async getPendingClaims() {
    return (await this.client.from('winner_claims').select('*, profiles(email)')).data || [];
  }

  async updateClaimStatus(id: string, status: string) {
    return !(await this.client.from('winner_claims').update({ status }).eq('id', id)).error;
  }

  async getLatestDraws() {
    return (
      (
        await this.client
          .from('monthly_draws')
          .select('*')
          .order('draw_date', { ascending: false })
          .limit(5)
      ).data || []
    );
  }

  async uploadProof(file: File, userId: string) {
    const filePath = `proofs/${userId}_${Date.now()}_${file.name}`;

    const { error } = await this.client.storage.from('proofs').upload(filePath, file);
    if (error) return { success: false, error: error.message };

    const { data: publicUrlData } = this.client.storage.from('proofs').getPublicUrl(filePath);
    return { success: true, url: publicUrlData.publicUrl };
  }

  async submitClaim(userId: string, proofUrl: string) {
    const { error } = await this.client.from('winner_claims').insert([
      {
        profile_id: userId,
        proof_url: proofUrl,
        status: 'Pending',
      },
    ]);
    return !error;
  }
}
