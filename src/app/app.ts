import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from './components/auth/auth';
import { UserDashboard } from './components/user-dashboard/user-dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Auth, UserDashboard],
  template: `
    <app-auth *ngIf="!currentUser" (userLoggedIn)="onLogin($event)"></app-auth>

    <app-user-dashboard *ngIf="currentUser" [user]="currentUser"></app-user-dashboard>
  `
})
export class App {
  currentUser: any = null;

  onLogin(user: any) {
    this.currentUser = user;
  }
}