import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

  // Semak jika URL adalah ke quizapi atau mengandungi endpoint quizcsv
  const isQuizApi = req.url.includes('quizapi.ezcigu.online') || req.url.includes('quizcsv');

  // Jika permintaan dihantar ke quizapi, teruskan TANPA menambah header Authorization
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