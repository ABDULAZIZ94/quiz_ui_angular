import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Semak sama ada pengguna sudah log masuk
    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    let user = authService.currentUser();

    // Jika role belum dimuatkan dalam session, ambil semula daripada Sheet
    if (user && !user.role) {
      const role = await authService.fetchUserRoleFromSheet(user.id);
      user = { ...user, role };
      authService['setSession'](authService.token() || '', user);
    }

    const currentRole: UserRole = user?.role || 'users'; // Default 'users' jika tiada rekod

    // Semak sama ada role pengguna dibenarkan mengakses route ini
    if (allowedRoles.includes(currentRole)) {
      return true;
    }

    // Jika tiada akses, bawa ke halaman tidak dibenarkan atau home
    router.navigate(['/unauthorized']);
    return false;
  };
};