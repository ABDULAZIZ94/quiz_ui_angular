import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Quiz, QuizListResponse } from '../models/quiz.model';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);
  private readonly quizUrl = environment.quizApiUrl;

  /**
   * Get all quizzes (paginated) from quiz service (port 8025)
   */
  getQuizzes(page = 1, pageSize = 10): Observable<QuizListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    return this.http.get<QuizListResponse>(`${this.quizUrl}/quizzes`, { params });
  }

  /**
   * Get a single quiz by ID
   */
  getQuiz(id: string | number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.quizUrl}/quizzes/${id}`);
  }

  /**
   * Create a new quiz
   */
  createQuiz(quiz: Quiz): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.quizUrl}/quizzes`, quiz);
  }

  /**
   * Update an existing quiz
   */
  updateQuiz(id: string | number, quiz: Partial<Quiz>): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.quizUrl}/quizzes/${id}`, quiz);
  }

  /**
   * Delete a quiz by ID
   */
  deleteQuiz(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.quizUrl}/quizzes/${id}`);
  }
}
