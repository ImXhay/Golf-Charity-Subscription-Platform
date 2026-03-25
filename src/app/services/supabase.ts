import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  public client: SupabaseClient;

  constructor() {
    const supabaseUrl = 'https://touymrieujxaowbvzdlo.supabase.co';
    const supabaseKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXltcmlldWp4YW93YnZ6ZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzA1NDQsImV4cCI6MjA4OTk0NjU0NH0.9QRu2eR9QWrV393gJLVsW5LAnc4-JVttUQe_HPArpnc';
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  // AUTH FUNCTION
  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    return { success: !error, user: data?.user, error: error?.message };
  }

  async signUp(email: string, password: string, charityId: string) {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error || !data.user) return { success: false, error: error?.message };

    const { error: profileError } = await this.client
      .from('profiles')
      .insert([
        { id: data.user.id, email: email, selected_charity_id: charityId, is_subscribed: false },
      ]);

    return { success: !profileError, user: data.user, error: profileError?.message };
  }

  async getProfile(userId: string) {
    const { data } = await this.client.from('profiles').select('*').eq('id', userId).single();
    return data;
  }

  async getAllProfiles() {
    const { data } = await this.client.from('profiles').select('*, charities(name)');
    return data || [];
  }

  async submitGolfScore(userId: string, newScore: number): Promise<boolean> {
    try {
      const { data: existingScores, error: fetchError } = await this.client
        .from('scores')
        .select('id')
        .eq('profile_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (existingScores && existingScores.length >= 5) {
        const oldestScoreId = existingScores[0].id;
        await this.client.from('scores').delete().eq('id', oldestScoreId);
      }

      const { error: insertError } = await this.client.from('scores').insert([
        {
          profile_id: userId,
          score_value: newScore,
          created_at: new Date().toISOString(),
        },
      ]);

      return !insertError;
    } catch (err) {
      console.error('Rolling score update failed:', err);
      return false;
    }
  }
  async getRecentScores(userId: string) {
    const { data } = await this.client
      .from('scores')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    return data || [];
  }

  async getCharities() {
    const { data } = await this.client.from('charities').select('*');
    return data || [];
  }

  async saveCharitySelection(userId: string, charityId: string) {
    const { error } = await this.client
      .from('profiles')
      .update({ selected_charity_id: charityId })
      .eq('id', userId);
    return !error;
  }

  async addCharity(name: string, description: string) {
    try {
      const { error } = await this.client.from('charities').insert([
        {
          name: name,
          description: description,
        },
      ]);

      return !error;
    } catch (err) {
      console.error('Insert failed:', err);
      return false;
    }
  }

  async deleteCharity(id: string) {
    const { error } = await this.client.from('charities').delete().eq('id', id);
    return !error;
  }

  async runMonthlyDraw() {
    try {
      const { data: users, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('is_subscribed', true);
        
      if (error || !users || users.length === 0) return { success: false, error: 'No active users' };
      const winningNumbers: number[] = [];
      while (winningNumbers.length < 5) {
        const num = Math.floor(Math.random() * 45) + 1;
        if (!winningNumbers.includes(num)) winningNumbers.push(num);
      }

      const winners = { tier5: [] as string[], tier4: [] as string[], tier3: [] as string[] };

      for (const user of users) {
        const { data: scores } = await this.client
          .from('scores')
          .select('score_value')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!scores || scores.length === 0) continue;

        const userNumbers = scores.map(s => s.score_value);
        
        let matchCount = 0;
        userNumbers.forEach(num => {
          if (winningNumbers.includes(num)) matchCount++;
        });

        if (matchCount === 5) winners.tier5.push(user.email);
        else if (matchCount === 4) winners.tier4.push(user.email);
        else if (matchCount === 3) winners.tier3.push(user.email);
      }

      const totalWinners = winners.tier5.length + winners.tier4.length + winners.tier3.length;

      await this.client.from('monthly_draws').insert([{ 
        winning_numbers: winningNumbers, 
        winner_count: totalWinners 
      }]);

      return { 
        success: true, 
        winningNumbers, 
        totalWinners,
        details: winners
      };
      
    } catch (err) {
      console.error('Draw execution failed:', err);
      return { success: false, error: 'System crash during draw.' };
    }
  }
  async getLatestDraws() {
    const { data } = await this.client
      .from('monthly_draws')
      .select('*')
      .order('draw_date', { ascending: false })
      .limit(3);
    return data || [];
  }

  async logout() {
    try {
      await this.client.auth.signOut();

      localStorage.clear();
      sessionStorage.clear();

      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed, forcing redirect:', err);
      window.location.href = '/';
    }
  }

  async submitWinnerProof(userId: string, file: File, drawDate: string) {
    try {
      const fileName = `${userId}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await this.client.storage
        .from('proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = this.client.storage.from('proofs').getPublicUrl(fileName);

      const { error: dbError } = await this.client.from('winner_claims').insert([
        {
          profile_id: userId,
          proof_url: urlData.publicUrl,
          draw_date: drawDate,
        },
      ]);

      return !dbError;
    } catch (err) {
      console.error('Proof upload failed:', err);
      return false;
    }
  }

  async getPendingClaims() {
    const { data } = await this.client
      .from('winner_claims')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });
    return data || [];
  }

  async updateClaimStatus(claimId: string, newStatus: 'Paid' | 'Rejected') {
    const { error } = await this.client
      .from('winner_claims')
      .update({ status: newStatus })
      .eq('id', claimId);
    return !error;
  }
}
