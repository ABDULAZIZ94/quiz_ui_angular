import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface ArabicItem {
  w: string;
  English?: string;
  Malay: string;
  Rohingya?: string;
  Urdu?: string;
  Transliteration?: string;
  Category?: string;
  ExampleArabic?: string;
  ExampleMalay?: string;
  Difficulty: number | string;
  ImageURL?: string;
}

export interface Question {
  arabicWord: string;
  image?: string;
  options: string[];
  answer: string;
  difficultyCategory: 'senang' | 'sederhana' | 'susah';
}

@Component({
  selector: 'app-arabic-quiz',
  imports: [CommonModule],
  templateUrl: './arabic-quiz.component.html',
  styleUrls: ['./arabic-quiz.component.css']
})
export class ArabicQuizComponent implements OnInit, OnDestroy {
  rawData: ArabicItem[] = [];
  allQuestions: Question[] = [];
  filteredQuestions: Question[] = [];

  // Status Permainan
  selectedDifficulty: string = '';
  isPlaying: boolean = false;
  isGameOver: boolean = false;
  isLoading: boolean = true;

  currentIndex: number = 0;
  score: number = 0;

  // Time Attack Settings
  timeLeft: number = 15;
  timer: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchQuizData();
  }

  fetchQuizData(): void {
    this.isLoading = true;
    this.http.get('https://quizapi.ezcigu.online/quizcsv', { responseType: 'text' }).subscribe({
      next: (csvText) => {
        const items = this.parseCSV(csvText);
        this.rawData = items;
        this.allQuestions = this.transformDataToQuestions(items);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ralat memuatkan data kuiz:', err);
        this.isLoading = false;
      }
    });
  }

  private parseCSV(csvText: string): ArabicItem[] {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result: ArabicItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      
      if (currentLine.length >= headers.length) {
        const item: any = {};
        headers.forEach((header, index) => {
          let value = currentLine[index] ? currentLine[index].trim() : '';
          value = value.replace(/^"|"$/g, '');
          item[header] = value;
        });
        result.push(item);
      }
    }
    return result;
  }

  private transformDataToQuestions(items: ArabicItem[]): Question[] {
    const allMalayAnswers = items.map(i => i.Malay).filter(Boolean);

    return items.map(item => {
      const diffNum = Number(item.Difficulty) || 10;
      let category: 'senang' | 'sederhana' | 'susah' = 'senang';

      if (diffNum <= 10) {
        category = 'senang';
      } else if (diffNum <= 15) {
        category = 'sederhana';
      } else {
        category = 'susah';
      }

      const wrongOptions = allMalayAnswers
        .filter(ans => ans !== item.Malay)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [item.Malay, ...wrongOptions].sort(() => 0.5 - Math.random());

      return {
        arabicWord: item.w,
        image: item.ImageURL || '',
        options: options,
        answer: item.Malay,
        difficultyCategory: category
      };
    });
  }

  startQuiz(difficulty: 'senang' | 'sederhana' | 'susah'): void {
    this.selectedDifficulty = difficulty;

    this.filteredQuestions = this.allQuestions
      .filter(q => q.difficultyCategory === difficulty)
      .sort(() => 0.5 - Math.random());

    if (this.filteredQuestions.length === 0) {
      this.filteredQuestions = [...this.allQuestions].sort(() => 0.5 - Math.random());
    }

    this.isPlaying = true;
    this.isGameOver = false;
    this.currentIndex = 0;
    this.score = 0;

    this.startTimer();
  }

  startTimer(): void {
    clearInterval(this.timer);
    this.timeLeft = 15;

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.endGame(); // Masa habis -> Terus Game Over
      }
    }, 1000);
  }

  selectAnswer(option: string): void {
    const currentQ = this.filteredQuestions[this.currentIndex];
    if (option === currentQ.answer) {
      this.score += 10 + (this.timeLeft * 2);
    }
    this.nextQuestion();
  }

  nextQuestion(): void {
    clearInterval(this.timer);
    this.currentIndex++;

    if (this.currentIndex < this.filteredQuestions.length) {
      this.startTimer();
    } else {
      this.endGame();
    }
  }

  endGame(): void {
    clearInterval(this.timer);
    this.isPlaying = false;
    this.isGameOver = true;
  }

  resetQuiz(): void {
    this.isPlaying = false;
    this.isGameOver = false;
    this.selectedDifficulty = '';
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}