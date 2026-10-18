
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

  const isExternalApi =
    req.url.includes('alquran.cloud') ||
    req.url.includes('quizapi.ezcigu.online') ||
    req.url.includes('quizcsv') ||
    req.url.includes('script.google.com');

  // API luaran: teruskan tanpa Authorization
  if (isExternalApi) {
    return next(req);
  }

  // API dalaman: tambah token jika tersedia
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
