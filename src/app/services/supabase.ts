import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = 'https://touymrieujxaowbvzdlo.supabase.co';
    const supabaseKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXltcmlldWp4YW93YnZ6ZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzA1NDQsImV4cCI6MjA4OTk0NjU0NH0.9QRu2eR9QWrV393gJLVsW5LAnc4-JVttUQe_HPArpnc';

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async submitGolfScore(userId: string, newScore: number): Promise<boolean> {
    // We wrap this in a very thin try/catch to ensure it ALWAYS returns something
    try {
      const { error } = await this.supabase.from('scores').insert([
        {
          profile_id: userId,
          score_value: newScore,
        },
      ]);

      if (error) {
        console.error('Supabase error caught:', error.message);
        return false;
      }

      return true; // The UI is waiting for THIS line to execute
    } catch (err) {
      console.error('Critical connection failure:', err);
      return false;
    }
  }
  // Fetches the last 5 scores for a specific user
  async getRecentScores(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('scores')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false }) // Reverse chronological order
        .limit(5); // Only keep the latest 5

      if (error) {
        console.error('Error fetching scores:', error);
        return [];
      }
      return data;
    } catch (err) {
      console.error('System error fetching scores:', err);
      return [];
    }
  }

  async getCharities() {
    const { data, error } = await this.supabase.from('charities').select('*');
    if (error) console.error('Error fetching charities:', error);
    return data;
  }

  async signUp(email: string, password: string, charityId: string) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error || !data.user) return { success: false, error: error?.message };

    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert([
        { id: data.user.id, email: email, selected_charity_id: charityId, is_subscribed: true },
      ]);

    if (profileError) return { success: false, error: profileError.message };
    return { success: true, user: data.user };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  }
}
