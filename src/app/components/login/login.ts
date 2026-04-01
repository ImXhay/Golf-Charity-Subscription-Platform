import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  email = '';
  password = '';
  error = signal('');
  isLoading = signal(false);

  isSignUp = signal(false);
  selectedCharityId = '';
  charities = signal<any[]>([]);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    const data = await this.supabase.getCharities();
    this.charities.set(data || []);
  }

  toggleMode() {
    this.isSignUp.update((val) => !val);
    this.error.set('');
  }

  async handleAuth() {
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields.');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
      if (this.isSignUp()) {
        if (!this.selectedCharityId) {
          this.error.set('Please select a charity to support.');
          this.isLoading.set(false);
          return;
        }
        const res = await this.supabase.signUp(this.email, this.password, this.selectedCharityId);
        if (!res.success) {
          this.error.set(res.error || 'Sign up failed.');
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        const res = await this.supabase.signIn(this.email, this.password);
        if (!res.success) {
          this.error.set(res.error || 'Invalid credentials.');
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      this.error.set('A system error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
