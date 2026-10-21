import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; // Sesuaikan path auth.service mengikut struktur projek anda

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage: string | null = null;

  /**
   * Dipanggil apabila pengguna menekan butang "Log Masuk dengan Google"
   */
  async onGoogleLogin(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      // Memanggil fungsi log masuk Firebase Google daripada AuthService
      await this.authService.loginWithGoogle();
      // AuthService akan mengendalikan penetapan token, peranan (role), dan navigasi ke '/aboutme'
    } catch (err: any) {
      console.error('Ralat Log Masuk Google:', err);
      this.errorMessage = err?.message || 'Log masuk Google gagal. Sila cuba lagi.';
    } finally {
      this.isLoading = false;
    }
  }
}