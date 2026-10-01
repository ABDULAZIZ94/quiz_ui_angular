import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word } from '../models/word.model';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FlashcardService {
  private http = inject(HttpClient);

  // Senarai asal semua perkataan yang dimuatkan dari CSV
  readonly allWords = signal<Word[]>([]);

  // State penapis tahap kesukaran (null = Semua Tahap, 1 - 10 = Tahap Spesifik)
  readonly selectedDifficulty = signal<number | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly currentIndex = signal(0);
  readonly isFlipped = signal(false);

  // 1. Senarai perkataan yang telah ditapis mengikut selectedDifficulty
  readonly words = computed(() => {
    const diff = this.selectedDifficulty();
    const list = this.allWords();
    if (diff === null) return list;
    return list.filter((w) => w.difficulty === diff);
  });

  // 2. Perkataan semasa berpandukan senarai yang telah ditapis
  get currentWord(): Word | null {
    const list = this.words();
    const index = this.currentIndex();
    return list.length > 0 && index < list.length ? list[index] : null;
  }

  // 3. Jumlah perkataan dalam senarai penapis semasa
  get total(): number {
    return this.words().length;
  }

  // 4. Jumlah keseluruhan perkataan tanpa tapisan
  readonly totalWordsCount = computed(() => this.allWords().length);

  // 5. Peratusan kemajuan (Progress bar)
  readonly progress = computed(() => {
    const totalWords = this.words().length;
    return totalWords > 0 ? ((this.currentIndex() + 1) / totalWords) * 100 : 0;
  });

  // 6. Mengira bilangan perkataan mengikut tahap kesukaran (Untuk balloon/badge)
  getWordCountByDifficulty(level: number): number {
    return this.allWords().filter((w) => w.difficulty === level).length;
  }

  // 7. Menukar tahap kesukaran dan menetapkan semula indeks kad ke 0
  setDifficulty(level: number | null): void {
    this.selectedDifficulty.set(level);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
  }

  loadVocabulary(): void {
    this.loading.set(true);
    this.error.set(null);

    const csvUrl =
      // 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=594182469&single=true&output=csv';
      // 'https://quizapi.ezcigu.online';
      'https://quizapi.ezcigu.online/quizcsv';
    this.http
      .get(csvUrl, { responseType: 'text' })
      .pipe(
        map((csvData) => {
          const sheetWords = this.parseCsv(csvData);
          return this.removeDuplicates(sheetWords);
        }),
        catchError((sheetErr) => {
          console.error('Gagal memuatkan Google Sheet CSV:', sheetErr);
          this.error.set('Gagal memuatkan data dari Google Sheet.');
          return of([]);
        })
      )
      .subscribe({
        next: (wordsFromCsv) => {
          this.allWords.set(wordsFromCsv);
          this.currentIndex.set(0);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Ralat tidak dijangka:', err);
          this.loading.set(false);
        },
      });
  }

  // Helper untuk membuang perkataan berulang
  private removeDuplicates(wordsList: Word[]): Word[] {
    const uniqueMap = new Map<string, Word>();
    for (const item of wordsList) {
      if (!item.arabic && !item.english) continue;
      const key = `${item.arabic.trim()}_${item.english.trim().toLowerCase()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
    return Array.from(uniqueMap.values());
  }

  private parseCsv(csvText: string): Word[] {
    if (!csvText) return [];

    const parseRows = (text: string): string[][] => {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentCell.trim());
          if (currentRow.some((cell) => cell.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }

      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
      }

      return rows;
    };

    const allRows = parseRows(csvText);

    if (allRows.length <= 1) return [];

    return allRows.slice(1).map((cols) => {
      const cleanCols = cols.map((col) => col.replace(/^"|"$/g, '').trim());

      return {
        arabic: cleanCols[0] || '',
        english: cleanCols[1] || '',
        malay: cleanCols[2] || '',
        rohingya: cleanCols[3] || '',
        urdu: cleanCols[4] || '',
        transliteration: cleanCols[5] || '',
        category: cleanCols[6] || '',
        exampleArabic: cleanCols[7] || '',
        exampleMalay: cleanCols[8] || '',
        difficulty: parseInt(cleanCols[9], 10) || 0,
        imageUrl: cleanCols[10] || '',
      };
    });
  }

  next(): void {
    if (this.currentIndex() < this.words().length - 1) {
      this.currentIndex.update((i) => i + 1);
      this.isFlipped.set(false);
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
      this.isFlipped.set(false);
    }
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.words().length) {
      this.currentIndex.set(index);
      this.isFlipped.set(false);
    }
  }

  flip(): void {
    this.isFlipped.update((f) => !f);
  }

  speak(word?: Word): void {
    const w = word ?? this.currentWord;
    if (w && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(w.arabic);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.75;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  }
}