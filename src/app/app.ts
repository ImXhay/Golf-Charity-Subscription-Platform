import { Component, OnInit, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Supabase } from './services/supabase';

// Component Imports
import { Login } from './components/login/login';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { LandingPage } from './components/landing-page/landing-page';
import { PaymentSuccess } from './components/payment-success/payment-success';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Login, UserDashboard, AdminDashboard, LandingPage, PaymentSuccess],
  templateUrl: './app.html'
})
export class App implements OnInit {
  currentUser = signal<any>(null);
  userRole = signal<'user' | 'admin' | null>(null);
  view = signal<'user' | 'admin'>('user');
  showLandingPage = signal(true);
  isSuccessPage = signal(false);

  constructor(
    private supabase: Supabase, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.isSuccessPage.set(window.location.pathname.includes('payment-success'));
    }
  }

  async ngOnInit() {
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      this.currentUser.set(user);
      
      if (user) {
        this.showLandingPage.set(false);
        // We run this without 'await' so it doesn't block the UI if the DB is slow
        this.checkUserRole(user.id);
      } else {
        this.userRole.set(null);
        if (!this.isSuccessPage()) this.showLandingPage.set(true);
      }
    });
  }

  async checkUserRole(userId: string) {
    try {
      // Set a default immediately so the UI isn't empty
      this.userRole.set('user');
      this.view.set('user');

      const profile = await this.supabase.getProfile(userId);
      
      if (profile && profile.role === 'admin') {
        this.userRole.set('admin');
        this.view.set('admin');
      }
      // If profile is 'user', the defaults we set above will stay
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