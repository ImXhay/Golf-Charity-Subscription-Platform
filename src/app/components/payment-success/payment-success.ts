import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="background: #050505; min-height: 100vh; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
      <div style="text-align: center; background: #111; padding: 40px; border-radius: 24px; border: 1px solid #222; max-width: 400px;">
        <div style="font-size: 3rem; margin-bottom: 20px;">✅</div>
        <h1 style="margin: 0 0 10px 0;">Payment Successful!</h1>
        <p style="color: #888; line-height: 1.6;">Your subscription is being activated. Redirecting you to your dashboard...</p>
        <div style="margin-top: 20px; border-top: 2px solid #00ffcc; width: 50px; margin-left: auto; margin-right: auto; animation: grow 1s infinite;"></div>
      </div>
    </div>
  `
})
export class PaymentSuccess implements OnInit {
  constructor(
    private supabase: Supabase, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.processPayment();
    }
  }

  async processPayment() {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { user }, error: authError } = await this.supabase.client.auth.getUser();

      if (user) {
        const { error: dbError } = await this.supabase.client
          .from('profiles')
          .update({ is_subscribed: true })
          .eq('id', user.id);

        if (dbError) {
          console.error('Supabase RLS or Update Error:', dbError.message);
          alert('Payment recorded, but profile update failed. Check database permissions.');
        } else {
          console.log('Subscription activated successfully!');
        }
      } else {
        console.error('No active session found. User might need to log in again.');
      }

    } catch (err) {
      console.error('Critical failure in payment success logic:', err);
    } finally {
      window.location.href = '/dashboard';
    }
  }
}