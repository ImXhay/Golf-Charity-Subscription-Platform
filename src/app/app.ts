import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supabase } from './services/supabase';
import { UserDashboard } from "./components/user-dashboard/user-dashboard";
import { Login } from './components/login/login';

@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [CommonModule, Login, UserDashboard], 
  templateUrl: './app.html'
})
export class App implements OnInit {
  currentUser = signal<any>(null);

  constructor(private supabaseService: Supabase) {}

  async ngOnInit() {
    const { data: { session } } = await this.supabaseService.client.auth.getSession();
    
    if (session) {
      this.currentUser.set(session.user);
    }

    // 2. Listen for auth changes (like logging out)
    this.supabaseService.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
      } else if (session) {
        this.currentUser.set(session.user);
      }
    });
  }

  handleLogin(user: any) {
    this.currentUser.set(user);
  }
}