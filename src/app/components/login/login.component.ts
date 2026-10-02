import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  message?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private apiUrl = 'https://script.google.com/macros/s/AKfycbxtY2Zm9EhX3GiHRzQMTL00wnqT2jjAz59JxPvz6VvG7nnJKYmU26BWiXygoUp0IT97rA/exec';

  credentials: LoginPayload = {
    username: '',
    password: ''
  };

  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onLogin() {
    this.isLoading = true;
    this.errorMessage = null;

    // Menghantar header text/plain untuk mengelakkan CORS OPTIONS preflight
    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    const payload = JSON.stringify(this.credentials);

    // Menggunakan responseType: 'text' untuk mengelakkan ralat JSON parsing dari pautan lencongan (redirect) Google Apps Script
    this.http.post(this.apiUrl, payload, { headers, responseType: 'text' }).subscribe({
      next: (responseText: string) => {
        this.isLoading = false;

        try {
          // Menukarkan respons teks secara manual kepada JSON
          const res: AuthResponse = JSON.parse(responseText);

          // Menyemak status jawapan dari Google Apps Script
          if (res && (res.status === 'authenticated' || res.status === 'success')) {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('username', this.credentials.username);
            
            this.router.navigate(['/quizgenerator']);
          } else {
            this.errorMessage = res.message || 'Log masuk gagal: Pengguna atau kata laluan tidak sah.';
          }
        } catch (e) {
          console.error('Ralat Parsing JSON:', e, responseText);
          this.errorMessage = 'Format maklum balas dari pelayan tidak sah.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Ralat rangkaian atau masalah akses Google Script. Sila cuba lagi.';
        console.error('Login Error:', err);
      }
    });
  }
}