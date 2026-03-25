import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.html'
})
export class LandingPage {
  @Output() navigateToAuth = new EventEmitter<void>();

  openAuth() {
    this.navigateToAuth.emit();
  }

  scrollToSteps() {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}