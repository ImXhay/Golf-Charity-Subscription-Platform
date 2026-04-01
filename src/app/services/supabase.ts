import { Injectable } from '@angular/core';
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

    const { error: pErr } = await this.client.from('profiles').upsert([
      {
        id: data.user.id,
        email: email,
        selected_charity_id: charityId,
        is_subscribed: false,
        total_paid: 0,
      },
    ]);

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

  async addCharity(name: string, description: string, imageUrl?: string | null) {
    const { error } = await this.client
      .from('charities')
      .insert([{ name, description, image_url: imageUrl }]);
    return !error;
  }

  async deleteCharity(id: string) {
    const { error } = await this.client.from('charities').delete().eq('id', id);
    return !error;
  }

  async saveCharitySelection(userId: string, charityId: string, percentage: number) {
    const { error } = await this.client
      .from('profiles')
      .update({ selected_charity_id: charityId, charity_percentage: percentage })
      .eq('id', userId);
    return !error;
  }

  async getCharityById(id: string) {
    const { data, error } = await this.client.from('charities').select('*').eq('id', id).single();
    if (error) return null;
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

  async runMonthlyDraw(
    isSimulation: boolean = false,
    drawType: 'random' | 'algorithmic' = 'random',
  ): Promise<any> {
    try {
      const { data: subs } = await this.client
        .from('profiles')
        .select('id, email')
        .eq('is_subscribed', true);
      let winNums: number[] = [];

      if (drawType === 'algorithmic') {
        const { data: allScores } = await this.client.from('scores').select('score_value');
        const freq: Record<number, number> = {};
        allScores?.forEach((s) => (freq[s.score_value] = (freq[s.score_value] || 0) + 1));
        const sortedByFreq = Object.keys(freq)
          .map(Number)
          .sort((a, b) => freq[b] - freq[a]);
        winNums = sortedByFreq.slice(0, 5);
        while (winNums.length < 5) {
          const r = Math.floor(Math.random() * 45) + 1;
          if (!winNums.includes(r)) winNums.push(r);
        }
      } else {
        while (winNums.length < 5) {
          const r = Math.floor(Math.random() * 45) + 1;
          if (!winNums.includes(r)) winNums.push(r);
        }
      }

      const pool = (subs?.length || 0) * 10;
      const winners: { tier5: any[]; tier4: any[]; tier3: any[] } = {
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
            if (matchCount === 5) winners.tier5.push(sub);
            else if (matchCount === 4) winners.tier4.push(sub);
            else if (matchCount === 3) winners.tier3.push(sub);
          }
        }
      }

      let rollover = 0;
      const tier5Payout = winners.tier5.length > 0 ? (pool * 0.4) / winners.tier5.length : 0;
      const tier4Payout = winners.tier4.length > 0 ? (pool * 0.35) / winners.tier4.length : 0;
      const tier3Payout = winners.tier3.length > 0 ? (pool * 0.25) / winners.tier3.length : 0;

      if (winners.tier5.length === 0) rollover = pool * 0.4;

      if (!isSimulation) {
        const { error } = await this.client.from('monthly_draws').insert([
          {
            winning_numbers: winNums,
            total_pool: pool,
            rollover_amount: rollover,
            draw_type: drawType,
          },
        ]);
        if (error) throw error;

        const awardPrizes = async (winnerArray: any[], payout: number) => {
          for (const w of winnerArray) {
            const { data: profile } = await this.client
              .from('profiles')
              .select('total_won')
              .eq('id', w.id)
              .single();
            const currentTotal = profile?.total_won || 0;
            await this.client
              .from('profiles')
              .update({ total_won: currentTotal + payout })
              .eq('id', w.id);
          }
        };

        await awardPrizes(winners.tier5, tier5Payout);
        await awardPrizes(winners.tier4, tier4Payout);
        await awardPrizes(winners.tier3, tier3Payout);
      }

      return {
        success: true,
        isSimulation,
        winningNumbers: winNums,
        totalPool: pool,
        totalWinners: winners.tier5.length + winners.tier4.length + winners.tier3.length,
        rolloverAmount: rollover,
        details: winners,
        payouts: { tier5: tier5Payout, tier4: tier4Payout, tier3: tier3Payout },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async updateScore(scoreId: string, newScore: number) {
    if (newScore < 1 || newScore > 45) return false;
    const { error } = await this.client
      .from('scores')
      .update({ score_value: newScore })
      .eq('id', scoreId);
    return !error;
  }

  async adminUpdateProfile(userId: string, isSubscribed: boolean) {
    const { error } = await this.client
      .from('profiles')
      .update({ is_subscribed: isSubscribed })
      .eq('id', userId);
    return !error;
  }

  async adminUpdateCharity(
    charityId: string,
    name: string,
    description: string,
    imageUrl?: string | null,
  ) {
    const updatePayload: any = { name, description };
    if (imageUrl) updatePayload.image_url = imageUrl;
    const { error } = await this.client.from('charities').update(updatePayload).eq('id', charityId);
    return !error;
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
    const { error } = await this.client.from('winner_claims').update({ status }).eq('id', id);
    if (status === 'Paid' && !error) {
      const { data: claim } = await this.client
        .from('winner_claims')
        .select('profile_id')
        .eq('id', id)
        .single();
      if (claim) {
        const { data: profile } = await this.client
          .from('profiles')
          .select('total_won')
          .eq('id', claim.profile_id)
          .single();
        await this.client
          .from('profiles')
          .update({ total_paid: profile?.total_won || 0 })
          .eq('id', claim.profile_id);
      }
    }
    return !error;
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
    const { error } = await this.client
      .from('winner_claims')
      .insert([{ profile_id: userId, proof_url: proofUrl, status: 'Pending' }]);
    return !error;
  }

  async getUserLatestClaim(userId: string) {
    const { data, error } = await this.client
      .from('winner_claims')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async uploadCharityImage(file: File) {
    const filePath = `${Date.now()}_${file.name}`;
    const { error } = await this.client.storage.from('charities').upload(filePath, file);
    if (error) return { success: false, error: error.message };
    const { data } = this.client.storage.from('charities').getPublicUrl(filePath);
    return { success: true, url: data.publicUrl };
  }
}
