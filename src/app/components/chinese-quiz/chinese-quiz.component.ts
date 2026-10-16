import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface QuizItem {
  hanzi: string;
  pinyin: string;
  meaning: string;
  options: string[];
}

@Component({
  selector: 'app-chinese-quiz',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './chinese-quiz.component.html',
  styleUrls: ['./chinese-quiz.component.css']
})
export class ChineseQuizComponent implements OnInit, OnDestroy {
  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=847252225&single=true&output=csv';
  apiScoreUrl = 'https://script.google.com/macros/s/AKfycbwhElUCuUPskUXPVCV8UPnVpUUjqkLsdcv2YXVbHq3yRA2-GAIphdHCcnx02GNfNkFBrg/exec';

  quizList: QuizItem[] = [];
  currentIndex = 0;
  score = 0;
  isFlipped = false;
  quizStarted = false;
  gameOver = false;
  
  // Time Attack & Freeze variables
  timeLeft = 30;
  timer: any;
  freezeTimer: any;
  isFrozen = false;

  // Status Pilihan Jawapan
  selectedOption: string | null = null;
  correctOption: string | null = null;

  // Input nama pemain & Status Skor
  playerName = 'Larim'; 
  submittingScore = false;
  scoreSubmitted = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadQuizData();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.clearFreezeTimer();
  }

  loadQuizData(): void {
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.quizList = this.parseCSV(data);
      },
      error: (err) => {
        console.error('Ralat memuatkan data CSV:', err);
      }
    });
  }

  parseCSV(csvText: string): QuizItem[] {
    const lines = csvText.split('\n');
    const result: QuizItem[] = [];
    const meaningsSet: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      if (row.length >= 3 && row[2]) {
        meaningsSet.push(row[2].trim());
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      if (row.length >= 3 && row[0] && row[1] && row[2]) {
        const meaning = row[2].trim();
        const options = this.generateOptions(meaning, meaningsSet);
        result.push({
          hanzi: row[0].trim(),
          pinyin: row[1].trim(),
          meaning: meaning,
          options: options
        });
      }
    }
    return this.shuffleArray(result);
  }

  parseCSVRow(row: string): string[] {
    const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return row.split(re).map(val => val.replace(/^"|"$/g, '').trim());
  }

  generateOptions(correctMeaning: string, allMeanings: string[]): string[] {
    const filtered = allMeanings.filter(m => m !== correctMeaning);
    const shuffledFiltered = this.shuffleArray([...filtered]);
    const options = [correctMeaning, ...shuffledFiltered.slice(0, 3)];
    return this.shuffleArray(options);
  }

  shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  startQuiz(): void {
    if (this.quizList.length === 0) {
      alert('Data kuiz masih dimuatkan. Sila cuba sebentar lagi.');
      return;
    }
    this.quizStarted = true;
    this.gameOver = false;
    this.currentIndex = 0;
    this.score = 0;
    this.isFlipped = false;
    this.scoreSubmitted = false;
    this.submittingScore = false;
    this.timeLeft = 30;
    this.isFrozen = false;
    this.selectedOption = null;
    this.correctOption = null;
    this.startTimer();
  }

  startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.endQuiz();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  clearFreezeTimer(): void {
    if (this.freezeTimer) {
      clearTimeout(this.freezeTimer);
    }
  }

  flipCard(): void {
    this.isFlipped = !this.isFlipped;
  }

  answerQuestion(option: string): void {
    if (this.isFrozen || this.gameOver) return;

    this.isFrozen = true;
    this.selectedOption = option;
    const currentItem = this.quizList[this.currentIndex];
    this.correctOption = currentItem.meaning;

    if (option === currentItem.meaning) {
      this.score += 10;
    }

    this.clearFreezeTimer();
    this.freezeTimer = setTimeout(() => {
      this.nextQuestion();
    }, 5000);
  }

  instantSkip(): void {
    if (this.isFrozen) {
      this.clearFreezeTimer();
      this.nextQuestion();
    }
  }

  nextQuestion(): void {
    this.clearFreezeTimer();
    this.isFrozen = false;
    this.selectedOption = null;
    this.correctOption = null;
    this.isFlipped = false;

    if (this.currentIndex < this.quizList.length - 1) {
      this.currentIndex++;
    } else {
      this.endQuiz();
    }
  }

  endQuiz(): void {
    this.stopTimer();
    this.clearFreezeTimer();
    this.gameOver = true;
    this.submitHighScore();
  }

  submitHighScore(): void {
    this.submittingScore = true;
    const payload = {
      name: this.playerName || 'Larim',
      quiz_name: 'Tajwid',
      score: this.score
    };

    this.http.post(this.apiScoreUrl, payload, { responseType: 'text' }).subscribe({
      next: () => {
        this.submittingScore = false;
        this.scoreSubmitted = true;
      },
      error: (err) => {
        this.submittingScore = false;
        this.scoreSubmitted = true;
        console.log('Status hantar skor:', err);
      }
    });
  }
}