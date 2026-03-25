import { Routes } from '@angular/router';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { PaymentSuccess } from './components/payment-success/payment-success';

export const routes: Routes = [
  { path: 'dashboard', component: UserDashboard },
  { path: 'admin', component: AdminDashboard },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'payment-success', component: PaymentSuccess }
];