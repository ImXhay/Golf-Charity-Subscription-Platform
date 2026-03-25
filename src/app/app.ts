import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supabase } from './services/supabase';
import { Login } from './components/login/login'; 
import { UserDashboard } from "./components/user-dashboard/user-dashboard";
import { AdminDashboard } from "./components/admin-dashboard/admin-dashboard"; 
import { LandingPage } from './components/landing-page/landing-page';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Login, UserDashboard, AdminDashboard, LandingPage], 
  templateUrl: './app.html'
})
export class App implements OnInit {
  currentUser = signal<any>(null);
  userRole = signal<string>('user'); 
  view = signal<'user' | 'admin'>('user'); 

  showLandingPage = signal<boolean>(true); 

  constructor(private supabaseService: Supabase) {}

  goToAuth() {
    this.showLandingPage.set(false);
  }

  async ngOnInit() {
    const { data: { session } } = await this.supabaseService.client.auth.getSession();
    
    if (session?.user) {
      this.currentUser.set(session.user);
      await this.loadUserRole(session.user.id);

      if (this.userRole() === 'admin') {
        this.view.set('admin');
      }
    }

    this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
        this.userRole.set('user'); 
        this.view.set('user'); 
        this.showLandingPage.set(true); 
      } 
      else if (session) {
        this.currentUser.set(session.user);
      
        await this.loadUserRole(session.user.id); 
      
        if (event === 'SIGNED_IN') {
          if (this.userRole() === 'admin') {
            this.view.set('admin'); 
          } else {
            this.view.set('user'); 
          }
        }
      }
    });
  }

  async loadUserRole(userId: string) {
    const profile = await this.supabaseService.getProfile(userId);
    if (profile && profile.role) {
      const cleanRole = profile.role.replace(/['"]/g, '').trim();
      this.userRole.set(cleanRole);
    } else {
      this.userRole.set('user'); 
    }
  }

  switchView(newView: 'user' | 'admin') {
    this.view.set(newView);
  }
}