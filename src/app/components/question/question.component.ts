import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Question {
  Name: string;
  Subject: string;
  Dificulity: string;
  Question: string;
  A: string;
  B: string;
  C: string;
  D: string;
  Answer: string;
  'created at': string;
}

@Component({
  selector: 'app-question',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit, OnDestroy {
  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=1385907564&single=true&output=csv';
  postUrl = 'https://script.google.com/macros/s/AKfycbwhElUCuUPskUXPVCV8UPnVpUUjqkLsdcv2YXVbHq3yRA2-GAIphdHCcnx02GNfNkFBrg/exec';

  allQuestions: Question[] = [];
  availableSubjects: string[] = [];
  
  // Tetapan Borang
  playerName: string = '';
  selectedSubject: string = '';
  selectedTime: number = 300; 
  timeOptions = [
    { label: '5 Minit', value: 300 },
    { label: '10 Minit', value: 600 },
    { label: '15 Minit', value: 900 }
  ];

  // Status Kuiz
  state: 'setup' | 'playing' | 'review' | 'submitted' = 'setup';
  quizQuestions: Question[] = [];
  userAnswers: { [key: number]: string } = {};
  score: number = 0;

  // Pemasa
  timeLeft: number = 0;
  timerInterval: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCSVData();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // 1. Ambil Data CSV melalui HTTP GET
  loadCSVData() {
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.parseCSV(data);
      },
      error: (err) => console.error('Ralat mengambil CSV:', err)
    });
  }

  // 2. Fungsi Parse CSV secara Manual
  parseCSV(csv: string) {
    const lines = csv.split('\n');
    const parsedData: Question[] = [];
    
    // Bermula dari indeks 1 untuk melangkau baris tajuk (header)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      
      // Memastikan setiap baris mempunyai sekurang-kurangnya 10 lajur yang diperlukan
      if (row.length >= 10) {
        parsedData.push({
          Name: row[0].replace(/"/g, '').trim(),
          Subject: row[1].replace(/"/g, '').trim(),
          Dificulity: row[2].replace(/"/g, '').trim(),
          Question: row[3].replace(/"/g, '').trim(),
          A: row[4].replace(/"/g, '').trim(),
          B: row[5].replace(/"/g, '').trim(),
          C: row[6].replace(/"/g, '').trim(),
          D: row[7].replace(/"/g, '').trim(),
          Answer: row[8].replace(/"/g, '').trim(),
          'created at': row[9].replace(/"/g, '').trim(),
        });
      }
    }
    this.allQuestions = parsedData;
    
    // Mengekstrak senarai subjek unik untuk pilihan pengguna
    this.availableSubjects = [...new Set(this.allQuestions.map(q => q.Subject))];
  }

  startQuiz() {
    if (!this.playerName || !this.selectedSubject) {
      alert('Sila masukkan nama dan pilih kuiz!');
      return;
    }
    
    this.quizQuestions = this.allQuestions.filter(q => q.Subject === this.selectedSubject);
    this.userAnswers = {};
    this.score = 0;
    this.state = 'playing';
    
    this.timeLeft = this.selectedTime;
    this.startTimer();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.finishAttempt(); 
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get formattedTime() {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  selectAnswer(index: number, answer: string) {
    this.userAnswers[index] = answer;
  }

  finishAttempt() {
    this.clearTimer();
    this.calculateScore();
    this.state = 'review';
  }

  calculateScore() {
    let correctCount = 0;
    this.quizQuestions.forEach((q, index) => {
      if (this.userAnswers[index] === q.Answer) {
        correctCount++;
      }
    });
    this.score = Math.round((correctCount / this.quizQuestions.length) * 100);
  }

submitHighscore() {
    const payload = {
      name: this.playerName,
      quiz_name: this.selectedSubject,
      score: this.score
    };

    const payloadString = JSON.stringify(payload);

    // Menggunakan API fetch asli untuk memintas semakan CORS
    fetch(this.postUrl, {
      method: 'POST',
      mode: 'no-cors', // Logik utama untuk mengabaikan semakan preflight
      headers: {
        'Content-Type': 'text/plain'
      },
      body: payloadString
    })
    .then(() => {
      // Perubahan state berjaya
      this.state = 'submitted';
      console.log('Skor berjaya dihantar ke Google Apps Script.');
    })
    .catch((err) => {
      console.error('Ralat menghantar skor:', err);
      alert('Berlaku ralat semasa menghantar skor.');
    });
  }

  reset() {
    this.state = 'setup';
    this.playerName = '';
    this.selectedSubject = '';
  }
}