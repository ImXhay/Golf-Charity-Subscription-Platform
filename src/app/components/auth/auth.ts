import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth.html',
})
export class Auth implements OnInit {
  @Output() userLoggedIn = new EventEmitter<any>();

  isLoginMode = true;
  charities: any[] = [];
  errorMessage = '';
  isLoading = false;

  constructor(private supabase: Supabase) {}

  async ngOnInit() {

    this.charities = await this.supabase.getCharities() || [];
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  async submitAuth(email: string, pass: string, charityId: string) {
    if (!email || !pass) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isLoginMode) {

      const res = await this.supabase.signIn(email, pass);
      if (res.success) {
        this.userLoggedIn.emit(res.user);
      } else {
        this.errorMessage = res.error || 'Login failed.';
      }
    } else {
      if (!charityId) {
        this.errorMessage = 'You must select a charity to support!';
        this.isLoading = false;
        return;
      }
      
      const res = await this.supabase.signUp(email, pass, charityId);
      if (res.success) {
        this.userLoggedIn.emit(res.user);
      } else {
        this.errorMessage = res.error || 'Signup failed.';
      }
    }
    this.isLoading = false;
  }
}