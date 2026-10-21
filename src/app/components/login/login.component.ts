import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment'; // Sesuaikan path jika perlu
import { User, UserRole } from '../../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);

  // Inisialisasi Firebase menggunakan data daripada environment.ts
  private firebaseApp = initializeApp(environment.firebase);
  private auth = getAuth(this.firebaseApp);

  private readonly tokenKey = 'jwt_token';
  private readonly userKey = 'current_user';

  // URL Google Sheets terbitan CSV
  private readonly userRoleCsvUrl = 
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=1442251816&single=true&output=csv';

  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));
  readonly currentUser = signal<User | null>(
    JSON.parse(localStorage.getItem(this.userKey) || 'null')
  );

  readonly isLoggedIn = computed(() => this.token() !== null);
  readonly userRole = computed<UserRole>(() => this.currentUser()?.role || 'users');

  /**
   * Log masuk menggunakan Google Pop-up Firebase
   */
  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const firebaseUser = result.user;

      const token = await firebaseUser.getIdToken();

      // Semak role pengguna daripada Google Sheets CSV
      const role = await this.fetchUserRoleFromSheet(firebaseUser.uid);

      const userData: User = {
        id: firebaseUser.uid,
        username: firebaseUser.email || '',
        email: firebaseUser.email || '',
        role: role
      };

      this.setSession(token, userData);
      this.router.navigate(['/aboutme']);
    } catch (error: any) {
      console.error('Ralat log masuk Google:', error);
      throw error;
    }
  }

  /**
   * Ambil data CSV daripada Google Sheets dan cari role berdasarkan UID
   */
  async fetchUserRoleFromSheet(uid: string): Promise<UserRole> {
    try {
      const csvData = await firstValueFrom(
        this.http.get(this.userRoleCsvUrl, { responseType: 'text' })
      );

      const rolesMap = this.parseCsvToRoleMap(csvData);
      const roleFound = rolesMap.get(uid);

      if (roleFound && ['users', 'admin', 'manage'].includes(roleFound)) {
        return roleFound as UserRole;
      }

      return 'users'; // Default jika uid tiada dalam rekod
    } catch (error) {
      console.error('Ralat mengambil data role daripada Google Sheets CSV:', error);
      return 'users'; // Default role jika sambungan ralat
    }
  }

  /**
   * Menukar teks CSV kepada Map(uid -> role)
   */
  private parseCsvToRoleMap(csvText: string): Map<string, string> {
    const roleMap = new Map<string, string>();
    const lines = csvText.split(/\r?\n/);

    if (lines.length <= 1) return roleMap;

    // Garis pertama adalah tajuk kolum (header): uid, role
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [uid, role] = line.split(',').map(item => item.trim().replace(/^"|"$/g, ''));
      if (uid && role) {
        roleMap.set(uid, role.toLowerCase());
      }
    }

    return roleMap;
  }

  /**
   * Logout — padam sesi Firebase dan storan tempatan
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.token.set(null);
      this.currentUser.set(null);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Ralat logout:', error);
    }
  }

  private setSession(token: string, user: User): void {
    this.token.set(token);
    this.currentUser.set(user);
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}