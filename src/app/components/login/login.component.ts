import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  status?: string;
  result?: string;
  message?: string;
  success?: boolean;
  [key: string]: any;
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

  onLogin(form?: NgForm) {
    if (form && form.invalid) {
      this.errorMessage = 'Silakan isi nama pengguna dan kata sandi.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Menggunakan text/plain untuk mengontrol CORS Preflight di Google Apps Script
    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    const payload = JSON.stringify(this.credentials);

    this.http.post(this.apiUrl, payload, { headers, responseType: 'text' }).subscribe({
      next: (responseText: string) => {
        this.isLoading = false;
        console.log('Respons mentah dari server:', responseText);

        // 1. Cek jika respons mengembalikan HTML (biasanya halaman error Google atau login Google)
        if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
          console.error('Menerima respons HTML alih-alih JSON:', responseText);
          this.errorMessage = 'Akses Google Apps Script ditolak atau mengembalikan halaman HTML. Pastikan deployment diatur ke "Anyone".';
          return;
        }

        try {
          const res: AuthResponse = JSON.parse(responseText);
          console.log('Hasil JSON parse:', res);

          // 2. Evaluasi berbagai format status berhasil dari Google Apps Script
          const isSuccess = 
            res.status === 'authenticated' || 
            res.status === 'success' || 
            res.result === 'success' || 
            res.success === true;

          if (isSuccess) {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('username', this.credentials.username);
            
            console.log('Login berhasil! Mengalihkan ke /quizgenerator...');
            
            // Pengalihan halaman ke route /quizgenerator
            this.router.navigate(['/quizgenerator']).then(navigated => {
              if (!navigated) {
                console.warn('Pengalihan halaman gagal. Memperbarui lokasi secara manual...');
                window.location.href = '/quizgenerator';
              }
            });
          } else {
            this.errorMessage = res.message || 'Log masuk gagal: Pengguna atau kata sandi tidak sah.';
          }
        } catch (e) {
          console.error('Ralat Parsing JSON:', e, responseText);
          this.errorMessage = 'Format respons dari server tidak sah atau tidak dapat diproses.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('HTTP Error:', err);
        this.errorMessage = 'Ralat rangkaian atau masalah akses Google Script. Sila cuba lagi.';
      }
    });
  }
}