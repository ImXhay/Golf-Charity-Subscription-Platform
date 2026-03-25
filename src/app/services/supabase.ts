import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  public client: SupabaseClient;

  constructor() {
    const supabaseUrl = 'https://touymrieujxaowbvzdlo.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXltcmlldWp4YW93YnZ6ZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzA1NDQsImV4cCI6MjA4OTk0NjU0NH0.9QRu2eR9QWrV393gJLVsW5LAnc4-JVttUQe_HPArpnc';
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    return { success: !error, user: data?.user, error: error?.message };
  }

  async signUp(email: string, password: string, charityId: string) {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error || !data.user) return { success: false, error: error?.message };

    const { error: profileError } = await this.client
      .from('profiles')
      .insert([{ id: data.user.id, email: email, selected_charity_id: charityId, is_subscribed: false }]);

    return { success: !profileError, user: data.user, error: profileError?.message };
  }

  async logout() {
    await this.client.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }

  async getProfile(userId: string) {
    const { data } = await this.client.from('profiles').select('*').eq('id', userId).single();
    return data;
  }

  async getAllProfiles() {
    const { data } = await this.client.from('profiles').select('*, charities(name)');
    return data || [];
  }

  async getCharities() {
    const { data } = await this.client.from('charities').select('*');
    return data || [];
  }

  async saveCharitySelection(userId: string, charityId: string) {
    const { error } = await this.client.from('profiles').update({ selected_charity_id: charityId }).eq('id', userId);
    return !error;
  }

  async addCharity(name: string, description: string) {
    const { error } = await this.client.from('charities').insert([{ name, description }]);
    return !error;
  }

  async deleteCharity(id: string) {
    const { error } = await this.client.from('charities').delete().eq('id', id);
    return !error;
  }

  async submitGolfScore(userId: string, newScore: number): Promise<boolean> {
    try {

      if (newScore < 1 || newScore > 45) return false;

      const profile = await this.getProfile(userId);
      if (!profile?.is_subscribed) return false;

      const { data: existingScores } = await this.client
        .from('scores')
        .select('id')
        .eq('profile_id', userId)
        .order('created_at', { ascending: true });

      if (existingScores && existingScores.length >= 5) {
        await this.client.from('scores').delete().eq('id', existingScores[0].id);
      }

      const { error } = await this.client.from('scores').insert([
        { profile_id: userId, score_value: newScore, created_at: new Date().toISOString() }
      ]);

      return !error;
    } catch (err) {
      return false;
    }
  }

  async getRecentScores(userId: string) {
    const { data } = await this.client
      .from('scores')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false }) //
      .limit(5);
    return data || [];
  }

  async runMonthlyDraw() {
    try {
      const { data: users } = await this.client.from('profiles').select('*').eq('is_subscribed', true);
      if (!users || users.length === 0) return { success: false, error: 'No active subscribers' };

      const winningNumbers: number[] = [];
      while (winningNumbers.length < 5) {
        const num = Math.floor(Math.random() * 45) + 1;
        if (!winningNumbers.includes(num)) winningNumbers.push(num);
      }

      const details = { tier5: [] as string[], tier4: [] as string[], tier3: [] as string[] };

      for (const user of users) {
        const { data: scores } = await this.client.from('scores').select('score_value').eq('profile_id', user.id).limit(5);
        if (!scores) continue;

        const userNumbers = scores.map(s => s.score_value);
        let matchCount = 0;
        userNumbers.forEach(num => { if (winningNumbers.includes(num)) matchCount++; });

        if (matchCount === 5) details.tier5.push(user.email);
        else if (matchCount === 4) details.tier4.push(user.email);
        else if (matchCount === 3) details.tier3.push(user.email);
      }

      const totalWinners = details.tier5.length + details.tier4.length + details.tier3.length;

      await this.client.from('monthly_draws').insert([{ winning_numbers: winningNumbers, winner_count: totalWinners }]);

      return { success: true, winningNumbers, totalWinners, details };
    } catch (err) {
      return { success: false, error: 'Draw Engine Failure' };
    }
  }

  async getLatestDraws() {
    const { data } = await this.client.from('monthly_draws').select('*').order('draw_date', { ascending: false }).limit(5);
    return data || [];
  }

  async submitWinnerProof(userId: string, file: File, drawDate: string) {
    const fileName = `${userId}-${Date.now()}`;
    await this.client.storage.from('proofs').upload(fileName, file);
    const { data: urlData } = this.client.storage.from('proofs').getPublicUrl(fileName);

    const { error } = await this.client.from('winner_claims').insert([
      { profile_id: userId, proof_url: urlData.publicUrl, draw_date: drawDate }
    ]);
    return !error;
  }

  async getPendingClaims() {
    const { data } = await this.client.from('winner_claims').select('*, profiles(email)').order('created_at', { ascending: false });
    return data || [];
  }

  async updateClaimStatus(claimId: string, status: 'Paid' | 'Rejected') {
    const { error } = await this.client.from('winner_claims').update({ status }).eq('id', claimId);
    return !error;
  }
}