import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  constructor(private supabase: Supabase, private router: Router) {}

  async ngOnInit() {
  const { data: { user } } = await this.supabase.client.auth.getUser();

  if (user) {
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ is_subscribed: true })
      .eq('id', user.id);

    if (!error) {
      console.log('Subscription activated!');

      setTimeout(() => {
   
        window.location.href = '/dashboard'; 
      }, 2000);
    }
  }
}
}