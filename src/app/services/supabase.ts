import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  // Made public so AppComponent can check the session on refresh
  public client: SupabaseClient;

  constructor() {
    const supabaseUrl = 'https://touymrieujxaowbvzdlo.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXltcmlldWp4YW93YnZ6ZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzA1NDQsImV4cCI6MjA4OTk0NjU0NH0.9QRu2eR9QWrV393gJLVsW5LAnc4-JVttUQe_HPArpnc';

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async getProfile(userId: string) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Error fetching profile:", err);
      return null;
    }
  }

  async getAllProfiles() {
    try {
      const { data, error }: any = await this.client
        .from('profiles')
        .select('*, charities(name)'); 

      if (error) {
        console.error('Admin Fetch Error:', error);
        return [];
      }
      return data;
    } catch (err) {
      console.error('System Error:', err);
      return [];
    }
  }

  async submitGolfScore(userId: string, newScore: number): Promise<boolean> {
    try {
      const { error: insertError } = await this.client
        .from('scores')
        .insert([{ profile_id: userId, score_value: newScore }]);

      if (insertError) return false;

      const { data: scores } = await this.client
        .from('scores')
        .select('id')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (scores && scores.length > 5) {
        const idsToDelete = scores.slice(5).map((s) => s.id);
        await this.client.from('scores').delete().in('id', idsToDelete);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async getRecentScores(userId: string) {
    try {
      const { data, error } = await this.client
        .from('scores')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getCharities() {
    const { data, error } = await this.client.from('charities').select('*');
    return data || [];
  }

  async saveCharitySelection(userId: string, charityId: string) {
    try {
      const { error } = await this.client
        .from('profiles')
        .update({ selected_charity_id: charityId }) 
        .eq('id', userId);
      return !error;
    } catch (err) {
      return false;
    }
  }

  async signUp(email: string, password: string, charityId: string) {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error || !data.user) return { success: false, error: error?.message };

    const { error: profileError } = await this.client
      .from('profiles')
      .insert([
        { id: data.user.id, email: email, selected_charity_id: charityId, is_subscribed: true },
      ]);

    return { success: !profileError, user: data.user, error: profileError?.message };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    return { success: !error, user: data?.user, error: error?.message };
  }

  async runMonthlyDraw() {
    try {
      const winningNumbers: number[] = [];
      while (winningNumbers.length < 5) {
        const r = Math.floor(Math.random() * 45) + 1;
        if (winningNumbers.indexOf(r) === -1) winningNumbers.push(r);
      }

      const { data: allScores } = await this.client.from('scores').select('profile_id, score_value');
      const matchingScores = allScores?.filter((s) => winningNumbers.includes(s.score_value)) || [];
      const uniqueWinnerIds = [...new Set(matchingScores.map((s) => s.profile_id))];

      await this.client.from('draw_results').insert([
        { winning_numbers: winningNumbers, total_prize_pool: 1000.0, charity_donation_total: 100.0 }
      ]);

      return { success: true, winningNumbers, winnerCount: uniqueWinnerIds.length };
    } catch (err) {
      return { success: false };
    }
  }
  
  async getLatestDraws() {
    const { data } = await this.client
      .from('draw_results')
      .select('*')
      .order('draw_date', { ascending: false })
      .limit(3);
    return data || [];
  }
}