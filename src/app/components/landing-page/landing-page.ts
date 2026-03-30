import { Component, OnInit, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.html'
})
export class LandingPage implements OnInit {
  @Output() navigateToAuth = new EventEmitter<void>();
  
  featuredCharity = signal<any>(null);

  constructor(private supabase: Supabase) {}

  async ngOnInit() {
    const charities = await this.supabase.getCharities();
    
    if (charities && charities.length > 0) {
      this.featuredCharity.set(charities[0]);
    }
  }
  
  openAuth() {
    this.navigateToAuth.emit();
  }

  scrollToSteps() {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}