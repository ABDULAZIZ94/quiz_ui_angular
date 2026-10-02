import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 1. Import FormsModule di sini

@Component({
  selector: 'app-generateslide',
  templateUrl: './generateslide.component.html',
  standalone: true, // Komponen adalah standalone
  imports: [
    CommonModule, 
    FormsModule // 2. Tambah FormsModule di sini
  ],
  styleUrls: ['./generateslide.component.css']
})
export class GenerateSlideComponent {
  private apiUrl = 'https://script.google.com/macros/s/AKfycbwnxDxxiRk9_lvHIUQIwZYVcoMJDTqxmzna1Hj9VwcGQ_I7V0bvLpJK3ybRNH-ImL2Z4Q/exec';

  isLoading: boolean = false;
  responseMessage: string = '';
  isSuccess: boolean = false;

  // Data ini kini boleh dikemas kini secara langsung daripada HTML melalui [(ngModel)]
  payload = {
    topic: 'Grammar grade 8',
    description: 'Sediakan mengikut tajuk, berikan perincian dan huraian dan contoh',
    total_slides: 6
  };

  constructor(private http: HttpClient) {}

  sendPostRequest(): void {
    this.isLoading = true;
    this.responseMessage = '';

    // Tetapkan header untuk kandungan JSON
    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8' // Mengelakkan isu CORS Preflight dengan Google Apps Script
    });

    this.http.post(this.apiUrl, JSON.stringify(this.payload), { headers }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSuccess = true;
        this.responseMessage = 'Data berjaya dihantar!';
        console.log('Respons:', response);
      },
      error: (error) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.responseMessage = 'Gagal menghantar data. Sila cuba lagi.';
        console.error('Ralat:', error);
      }
    });
  }
}