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
      const { data: { user } } = await this.supabase.client.auth.getUser();

      if (user) {
        // Calculate a date exactly 30 days from right now
        const renewalDate = new Date();
        renewalDate.setDate(renewalDate.getDate() + 30);

        // Save BOTH the active status and the renewal date to the database
        await this.supabase.client
          .from('profiles')
          .update({ 
            is_subscribed: true,
            subscription_end_date: renewalDate.toISOString() 
          })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }
  }
}