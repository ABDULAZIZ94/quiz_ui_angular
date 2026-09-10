import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly ssoUrl = environment.ssoApiUrl;
  private readonly tokenKey = 'jwt_token';
  private readonly userKey = 'current_user';

  // Signals for reactive state
  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));
  readonly currentUser = signal<User | null>(
    JSON.parse(localStorage.getItem(this.userKey) || 'null')
  );

  readonly isLoggedIn = computed(() => this.token() !== null);

  /**
   * Login with username & password via SSO service (port 8014)
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.ssoUrl}/login`, credentials).pipe(
      tap((res) => this.setSession(res))
    );
  }

  /**
   * Register a new user via SSO service (port 8014)
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.ssoUrl}/register`, data).pipe(
      tap((res) => this.setSession(res))
    );
  }

  /**
   * Get current user profile from SSO service
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.ssoUrl}/me`);
  }

  /**
   * Refresh token via SSO service
   */
  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.ssoUrl}/refresh`, { refresh_token: refreshToken })
      .pipe(tap((res) => this.setSession(res)));
  }

  /**
   * Logout — clear local storage and redirect
   */
  logout(): void {
    this.http.post(`${this.ssoUrl}/logout`, {}).subscribe({
      complete: () => {
        this.clearSession();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.clearSession();
        this.router.navigate(['/login']);
      },
    });
  }

  private setSession(res: AuthResponse): void {
    this.token.set(res.token);
    this.currentUser.set(res.user);
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}
