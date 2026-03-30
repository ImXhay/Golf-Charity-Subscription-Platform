import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-charity-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './charity-profile.html',
})
export class CharityProfile implements OnInit {
  charity = signal<any>(null);
  isLoading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: Supabase,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      const data = await this.supabase.getCharityById(id);
      this.charity.set(data);
    }
    this.isLoading.set(false);
  }

  donateDirectly(charityName: string | undefined) {
    if (!charityName) return;
    window.location.href = 'https://buy.stripe.com/test_6oU00j0Y09oJdax8DD5os02';
  }

  goBack() {
    this.router.navigate(['/charities']);
  }
}
