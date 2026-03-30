import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../services/supabase';
import { Router } from '@angular/router';

@Component({
  selector: 'app-charity-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './charity-directory.html',
})
export class CharityDirectory implements OnInit {
  charities = signal<any[]>([]);
  searchQuery = signal('');

  filteredCharities = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.charities().filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
    );
  });

  constructor(
    private supabase: Supabase,
    private router: Router,
  ) {}

  async ngOnInit() {
    const data = await this.supabase.getCharities();
    this.charities.set(data || []);
  }

  viewProfile(charityId: string) {
    this.router.navigate(['/charity', charityId]);
  }
}
