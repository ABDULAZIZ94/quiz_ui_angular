import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface QuizPayload {
  no_questions: number;
  difficulty: string;
  subject: string;
  detailed_instruction: string;
}

@Component({
  selector: 'app-quiz-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quizgenerator.component.html',
  styleUrl: './quizgenerator.component.css'
})
export class QuizGeneratorComponent {
  private apiUrl = 'https://script.google.com/macros/s/AKfycbzoxekq07wg1t6nwOnbEq7O8zq6rHc_iBwimBebwxS-SA1Z2pRJbnU_rP8DNLMThtu1pA/exec';

  // Data lalai (default data)
  formData: QuizPayload = {
    no_questions: 30,
    difficulty: 'Senang',
    subject: 'Hafazan juz amma',
    detailed_instruction: 'berikan soalan berkaitan topic, yang logic dan berkaitan'
  };

  isLoading = false;
  responseMessage: string | null = null;
  isSuccess = false;

  constructor(private http: HttpClient) {}

  submitForm() {
    this.isLoading = true;
    this.responseMessage = null;

    /**
     * Google Apps Script memerlukan 'text/plain' atau 'application/x-www-form-urlencoded' 
     * untuk mengelakkan isu CORS preflight bagi permintaan POST.
     */
    this.http.post(this.apiUrl, JSON.stringify(this.formData), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isSuccess = true;
        this.responseMessage = 'Penjanaan kuiz berjaya dihantar!';
        console.log('Respons:', res);
      },
      error: (err) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.responseMessage = 'Gagal menghantar permintaan. Sila cuba lagi.';
        console.error('Ralat:', err);
      }
    });
  }
}