import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface WordData {
  arabic: string;
  english: string;
  malay: string;
  urdu: string;
  transliteration: string;
  category: string;
  exampleArabic: string;
  exampleEnglish: string;
}

interface Question {
  questionWord: string; 
  correctAnswer: string; 
  options: string[]; 
  imageUrl: string; 
}

@Component({
  selector: 'app-testabcd',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './testabcd.component.html',
  styleUrls: ['./testabcd.component.css']
})
export class TestabcdComponent implements OnInit, OnDestroy {
  words: WordData[] = [];
  
  gameState: 'start' | 'playing' | 'gameover' = 'start';
  playerName: string = '';
  difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  score: number = 0;
  timeLeft: number = 0;
  
  currentQuestion: Question | null = null;
  timerInterval: any;

  ngOnInit() {
    this.fetchData();
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  async fetchData() {
    try {
      const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=594182469&single=true&output=csv';
      const response = await fetch(url);
      const csvText = await response.text();
      this.parseCSV(csvText);
    } catch (error) {
      console.error('Gagal memuat turun data:', error);
    }
  }

  parseCSV(csv: string) {
    const lines = csv.split('\n');
    const parsedData: WordData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (row.length >= 8) {
        parsedData.push({
          arabic: row[0].replace(/"/g, '').trim(),
          english: row[1].replace(/"/g, '').trim(),
          malay: row[2].replace(/"/g, '').trim(),
          urdu: row[3].replace(/"/g, '').trim(),
          transliteration: row[4].replace(/"/g, '').trim(),
          category: row[5].replace(/"/g, '').trim(),
          exampleArabic: row[6].replace(/"/g, '').trim(),
          exampleEnglish: row[7].replace(/"/g, '').trim(),
        });
      }
    }
    this.words = parsedData;
  }

  startGame() {
    this.score = 0;
    this.gameState = 'playing';
    
    switch (this.difficulty) {
      case 'easy': this.timeLeft = 60; break;
      case 'medium': this.timeLeft = 45; break;
      case 'hard': this.timeLeft = 30; break;
    }
    
    this.generateQuestion();
    this.startTimer();
  }

  startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  generateQuestion() {
    const randomIndex = Math.floor(Math.random() * this.words.length);
    const correctWord = this.words[randomIndex];
    
    const options = [correctWord.malay];
    
    while (options.length < 4) {
      const wrongIndex = Math.floor(Math.random() * this.words.length);
      const wrongMalay = this.words[wrongIndex].malay;
      if (!options.includes(wrongMalay)) {
        options.push(wrongMalay);
      }
    }

    const wordForImage = correctWord.english || 'Soalan';

    this.currentQuestion = {
      questionWord: correctWord.english || correctWord.arabic, 
      correctAnswer: correctWord.malay,
      options: this.shuffleArray(options),
      // LOGIK DIPERBARUI: Hasilkan gambar menggunakan .png, ?text=, dan encodeURIComponent
      imageUrl: `https://dummyimage.com/400x200/007bff/ffffff.png?text=${encodeURIComponent(wordForImage)}`
    };
  }

  submitAnswer(selected: string) {
    if (this.currentQuestion && selected === this.currentQuestion.correctAnswer) {
      let points = 0;
      switch (this.difficulty) {
        case 'easy': points = 10; break;
        case 'medium': points = 20; break;
        case 'hard': points = 30; break;
      }
      this.score += points;
      this.timeLeft += 2; 
    } else {
      this.timeLeft = Math.max(0, this.timeLeft - 5);
    }
    
    if (this.timeLeft > 0) {
      this.generateQuestion();
    } else {
      this.endGame();
    }
  }

  endGame() {
    this.clearTimer();
    this.gameState = 'gameover';
  }

  resetGame() {
    this.gameState = 'start';
    this.playerName = '';
  }

  getLabel(index: number): string {
    return ['A', 'B', 'C', 'D'][index];
  }

  shuffleArray(array: string[]): string[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}