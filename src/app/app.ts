import { Component, OnInit, OnDestroy, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Supabase } from './services/supabase';

import { Login } from './components/login/login';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { LandingPage } from './components/landing-page/landing-page';
import { PaymentSuccess } from './components/payment-success/payment-success';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Login, UserDashboard, LandingPage, PaymentSuccess, AdminDashboard],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  // FIX: Implemented OnDestroy
  isAuthReady = signal(false);
  currentUser = signal<any>(null);
  userRole = signal<'user' | 'admin' | null>(null);
  view = signal<'user' | 'admin'>('user');
  showLandingPage = signal(true);
  isSuccessPage = signal(false);

  private authSubscription: any;

  constructor(
    private supabase: Supabase,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.isSuccessPage.set(window.location.pathname.includes('payment-success'));
    }
  }

  async ngOnInit() {
    const {
      data: { session },
    } = await this.supabase.client.auth.getSession();

    if (session?.user) {
      this.currentUser.set(session.user);
      this.showLandingPage.set(false);
      await this.checkUserRole(session.user.id);
    } else {
      if (!this.isSuccessPage()) this.showLandingPage.set(true);
    }

    this.isAuthReady.set(true);

    const { data } = this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      this.currentUser.set(user);

      if (user) {
        this.showLandingPage.set(false);
        this.checkUserRole(user.id);
      } else {
        this.userRole.set(null);
        if (!this.isSuccessPage()) this.showLandingPage.set(true);
      }
    });

    this.authSubscription = data.subscription;
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async checkUserRole(userId: string) {
    try {
      this.userRole.set('user');
      this.view.set('user');

      const profile = await this.supabase.getProfile(userId);

      if (profile && profile.role === 'admin') {
        this.userRole.set('admin');
        this.view.set('admin');
      }
    } catch (err) {
      console.error('Role check failed, defaulting to user view:', err);
    }
  }

  goToAuth() {
    this.showLandingPage.set(false);
  }

  switchView(target: 'user' | 'admin') {
    this.view.set(target);
  }
}
