import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './services/auth.service'; // Tukar mengikut laluan AuthService anda

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Semak status log masuk pengguna
  if (authService.isLoggedIn()) {
    return true; // Dibenarkan masuk
  }

  // Jika belum log masuk, lencongkan (redirect) ke halaman login
  router.navigate(['/login']);
  return false;
};