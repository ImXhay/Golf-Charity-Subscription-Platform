import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  @Output() onLogin = new EventEmitter<any>();
  
  email = '';
  password = '';
  error = signal('');

  constructor(private supabase: Supabase) {}

  async handleSignIn() {
    this.error.set('');
    const result = await this.supabase.signIn(this.email, this.password);
    
    if (result.success) {
      this.onLogin.emit(result.user);
    } else {
      this.error.set(result.error || 'Invalid login credentials');
    }
  }
}