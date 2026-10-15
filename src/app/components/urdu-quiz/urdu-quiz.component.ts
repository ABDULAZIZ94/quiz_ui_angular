import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface QuizItem {
  arabic: string;
  english: string;
  malay: string;
  rohingya: string;
  urdu: string;
  transliteration: string;
  category: string;
  exampleArabic: string;
  exampleMalay: string;
  difficulty: string;
  imageUrl: string;
}

interface Question {
  promptText: string;
  options: string[];
  answer: string;
  imageUrl: string;
  category: string;
}

@Component({
  selector: 'app-urdu-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './urdu-quiz.component.html',
  styleUrls: ['./urdu-quiz.component.css']
})
export class UrduQuizComponent implements OnInit, OnDestroy {
  // Peringkat & Status Permainan
  currentLevel: number = 1;
  maxLevels: number = 5;
  gameState: 'start' | 'playing' | 'gameover' | 'completed' = 'start';
  
  playerName: string = '';
  quizName: string = 'Urdu Time Attack';
  
  allQuizData: QuizItem[] = [];
  currentQuestions: Question[] = [];
  currentIndex: number = 0;
  
  score: number = 0;
  timer: number = 30; // Masa permulaan (saat)
  timerInterval: any;
  
  selectedOption: string | null = null;
  isAnswered: boolean = false;
  isCorrect: boolean | null = null;

  // Endpoint Google Apps Script & API CSV
  private scriptUrl = 'https://script.google.com/macros/s/AKfycbwhElUCuUPskUXPVCV8UPnVpUUjqkLsdcv2YXVbHq3yRA2-GAIphdHCcnx02GNfNkFBrg/exec';
  private csvUrl = 'https://quizapi.ezcigu.online/quizcsv';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchQuizData();
  }

  ngOnDestroy(): void {
    this.clearIntervals();
  }

  fetchQuizData(): void {
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.allQuizData = this.parseCSV(data);
      },
      error: (err) => {
        console.error('Ralat memuatkan data CSV:', err);
      }
    });
  }

  // Parse CSV mengikut susunan kolum sebenar
  parseCSV(csvText: string): QuizItem[] {
    const lines = csvText.split('\n');
    const result: QuizItem[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = this.parseCSVLine(line);
      if (cols.length >= 11) {
        result.push({
          arabic: cols[0],
          english: cols[1],
          malay: cols[2],
          rohingya: cols[3],
          urdu: cols[4],
          transliteration: cols[5],
          category: cols[6],
          exampleArabic: cols[7],
          exampleMalay: cols[8],
          difficulty: cols[9],
          imageUrl: cols[10]
        });
      }
    }
    return result;
  }

  parseCSVLine(text: string): string[] {
    let result: string[] = [];
    let insideQuotes = false;
    let entry = '';
    
    for (let i = 0; i < text.length; i++) {
      let char = text[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(entry.trim().replace(/^"|"$/g, ''));
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry.trim().replace(/^"|"$/g, ''));
    return result;
  }

  startQuiz(): void {
    if (!this.playerName.trim()) {
      alert('Sila masukkan nama anda terlebih dahulu!');
      return;
    }
    if (this.allQuizData.length === 0) {
      alert('Data kuiz masih belum siap dimuat turun. Sila cuba sebentar lagi.');
      return;
    }
    this.currentLevel = 1;
    this.score = 0;
    this.gameState = 'playing';
    this.loadLevel();
  }

  loadLevel(): void {
    this.currentIndex = 0;
    
    const startIndex = (this.currentLevel - 1) * 5;
    let levelItems = this.allQuizData.slice(startIndex, startIndex + 5);
    
    if (levelItems.length === 0) {
      levelItems = this.allQuizData.slice(0, 5);
    }

    this.currentQuestions = levelItems.map(item => {
      const correctAnswer = item.urdu;
      const wrongOptions = this.allQuizData
        .filter(q => q.urdu !== correctAnswer)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(q => q.urdu);
      
      const options = [...wrongOptions, correctAnswer].sort(() => 0.5 - Math.random());

      return {
        promptText: `Apakah terjemahan Urdu bagi perkataan / maksud Melayu: "${item.malay}" (${item.english})?`,
        options: options,
        answer: correctAnswer,
        imageUrl: item.imageUrl,
        category: item.category
      };
    });

    this.timer = 35 - (this.currentLevel * 3);
    if (this.timer < 10) this.timer = 10;
    
    this.startTimer();
    this.loadNextQuestion();
  }

  startTimer(): void {
    this.clearIntervals();
    this.timerInterval = setInterval(() => {
      this.timer--;
      if (this.timer <= 0) {
        this.clearIntervals();
        this.gameState = 'gameover';
      }
    }, 1000);
  }

  clearIntervals(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadNextQuestion(): void {
    this.selectedOption = null;
    this.isAnswered = false;
    this.isCorrect = null;
  }

  selectOption(option: string): void {
    if (this.isAnswered) return;
    this.isAnswered = true;
    this.selectedOption = option;

    const currentQ = this.currentQuestions[this.currentIndex];
    if (option === currentQ.answer) {
      this.isCorrect = true;
      this.score += 10;
      this.timer += 5; // Betul tambah 5 saat
    } else {
      this.isCorrect = false;
      this.timer -= 5; // Salah tolak 5 saat
      if (this.timer < 0) this.timer = 0;
    }

    setTimeout(() => {
      if (this.timer <= 0) {
        this.clearIntervals();
        this.gameState = 'gameover';
        return;
      }

      this.currentIndex++;
      if (this.currentIndex < this.currentQuestions.length) {
        this.loadNextQuestion();
      } else {
        if (this.currentLevel < this.maxLevels) {
          this.currentLevel++;
          this.loadLevel();
        } else {
          this.clearIntervals();
          this.gameState = 'completed';
          this.saveScore();
        }
      }
    }, 1000);
  }

  saveScore(): void {
    const payload = {
      name: this.playerName,
      quiz_name: this.quizName,
      score: this.score
    };

    this.http.post(this.scriptUrl, payload).subscribe({
      next: () => console.log('Skor berjaya disimpan!'),
      error: (err) => console.error('Ralat simpan skor:', err)
    });
  }

  restartGame(): void {
    this.gameState = 'start';
    this.playerName = '';
  }
}