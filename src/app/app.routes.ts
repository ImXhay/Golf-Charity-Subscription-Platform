import { Routes } from '@angular/router';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { PaymentSuccess } from './components/payment-success/payment-success';
import { CharityDirectory } from './components/charity-directory/charity-directory';
import { CharityProfile } from './components/charity-profile/charity-profile';

export const routes: Routes = [
  { path: 'dashboard', component: UserDashboard },
  { path: 'admin', component: AdminDashboard },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'charities', component: CharityDirectory },
  { path: 'charity/:id', component: CharityProfile },
  { path: 'payment-success', component: PaymentSuccess }
];