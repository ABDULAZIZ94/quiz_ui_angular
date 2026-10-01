import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

// Semak jika URL adalah ke quizapi, quizcsv, atau Google Apps Script
const isQuizApi = req.url.includes('quizapi.ezcigu.online') || 
                  req.url.includes('quizcsv') ||
                  req.url.includes('script.google.com'); // <-- Tambah URL baru di sini

// Jika permintaan dihantar ke URL dikecualikan, teruskan TANPA menambah header Authorization
if (isQuizApi) {
  return next(req);
}
  // Untuk permintaan lain, tambah header Authorization jika token wujud
  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};