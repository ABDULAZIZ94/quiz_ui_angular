import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word } from '../models/word.model';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FlashcardService {
  private http = inject(HttpClient);

  // Static words (fallback jika CSV gagal atau sebagai data asas)
  private readonly staticWords: Word[] = [
    { arabic: 'مَرْحَبًا', english: 'Hello', translit: 'Marhaban', category: 'Greeting', example: '<strong>مَرْحَبًا</strong> — used to greet someone warmly' },
    { arabic: 'سَلَام', english: 'Peace', translit: 'Salam', category: 'Greeting', example: '<strong>السَّلَامُ عَلَيْكُم</strong> — Peace be upon you' },
    { arabic: 'شُكْرًا', english: 'Thank you', translit: 'Shukran', category: 'Expression', example: '<strong>شُكْرًا جَزِيلًا</strong> — Thank you very much' },
    { arabic: 'نَعَم', english: 'Yes', translit: "Na'am", category: 'Basic', example: '<strong>نَعَم</strong> — affirmative response' },
    { arabic: 'لَا', english: 'No', translit: 'La', category: 'Basic', example: '<strong>لَا</strong> — negative response' },
    { arabic: 'كِتَاب', english: 'Book', translit: 'Kitab', category: 'Noun', example: '<strong>هَذَا كِتَاب</strong> — This is a book' },
    { arabic: 'مَاء', english: 'Water', translit: "Ma'", category: 'Noun', example: '<strong>أُرِيدُ مَاء</strong> — I want water' },
    { arabic: 'بَيْت', english: 'House', translit: 'Bayt', category: 'Noun', example: '<strong>بَيْتِي</strong> — My house' },
    { arabic: 'رَجُل', english: 'Man', translit: 'Rajul', category: 'Noun', example: '<strong>رَجُل كَبِير</strong> — An old man' },
    { arabic: 'اِمْرَأَة', english: 'Woman', translit: "Imra'ah", category: 'Noun', example: '<strong>اِمْرَأَة جَمِيلَة</strong> — A beautiful woman' },
    { arabic: 'يَوْم', english: 'Day', translit: 'Yawm', category: 'Time', example: '<strong>يَوْم جَمِيل</strong> — A beautiful day' },
    { arabic: 'لَيْل', english: 'Night', translit: 'Layl', category: 'Time', example: '<strong>لَيْل سَاكِن</strong> — A quiet night' },
    { arabic: 'شَمْس', english: 'Sun', translit: 'Shams', category: 'Nature', example: '<strong>الشَّمْس مُشْرِقَة</strong> — The sun is shining' },
    { arabic: 'قَمَر', english: 'Moon', translit: 'Qamar', category: 'Nature', example: '<strong>الْقَمَر جَمِيل</strong> — The moon is beautiful' },
    { arabic: 'حُب', english: 'Love', translit: 'Hubb', category: 'Feeling', example: '<strong>أُحِبُّك</strong> — I love you' },
    { arabic: 'جَيِّد', english: 'Good', translit: 'Jayyid', category: 'Adjective', example: '<strong>وَلَد جَيِّد</strong> — A good boy' },
    { arabic: 'صَدِيق', english: 'Friend', translit: 'Sadiq', category: 'Noun', example: '<strong>صَدِيقِي</strong> — My friend' },
    { arabic: 'طَعَام', english: 'Food', translit: "Ta'am", category: 'Noun', example: '<strong>الطَّعَام لَذِيذ</strong> — The food is delicious' },
    { arabic: 'عِلْم', english: 'Knowledge', translit: 'Ilm', category: 'Noun', example: '<strong>طَلَبُ الْعِلْم</strong> — Seeking knowledge' },
    { arabic: 'جَزَاكَ اللهُ خَيْرًا', english: 'May Allah reward you', translit: 'Jazakallahu Khayran', category: 'Expression', example: '<strong>جَزَاكَ اللهُ خَيْرًا</strong> — a common way to say thank you' },
  ];

  readonly words = signal<Word[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly currentIndex = signal(0);
  readonly isFlipped = signal(false);

  get currentWord(): Word | null {
    const list = this.words();
    const index = this.currentIndex();
    return list.length > 0 && index < list.length ? list[index] : null;
  }

  get total(): number {
    return this.words().length;
  }

  readonly progress = computed(() => {
    const totalWords = this.words().length;
    return totalWords > 0 ? ((this.currentIndex() + 1) / totalWords) * 100 : 0;
  });

  loadVocabulary(): void {
    this.loading.set(true);
    this.error.set(null);

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=0&single=true&output=csv';

    // Ambil data terus daripada Google Sheet CSV
    this.http.get(csvUrl, { responseType: 'text' }).pipe(
      map((csvData) => {
        const sheetWords = this.parseCsv(csvData);
        // Cantumkan staticWords + sheetWords dan tapis sebarang duplikasi
        return this.removeDuplicates([...this.staticWords, ...sheetWords]);
      }),
      catchError((sheetErr) => {
        console.error('Gagal memuatkan Google Sheet CSV:', sheetErr);
        this.error.set('Gagal memuatkan data dari Google Sheet.');
        // Jika CSV gagal, sekurang-kurangnya pulangkan staticWords
        return of(this.removeDuplicates([...this.staticWords]));
      })
    ).subscribe({
      next: (allWords) => {
        this.words.set(allWords);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Ralat tidak dijangka:', err);
        this.loading.set(false);
      }
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

  // Helper untuk parse CSV dengan sokongan pembersihan watak \r\n
  private parseCsv(csvText: string): Word[] {
    if (!csvText) return [];

    const lines = csvText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length <= 1) return [];

    return lines.slice(1).map((line) => {
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const cleanCols = cols.map(col => col.replace(/^"|"$/g, '').trim());

      return {
        arabic: cleanCols[0] || '',
        english: cleanCols[1] || '',
        translit: cleanCols[2] || '',
        category: cleanCols[3] || '',
        example: cleanCols[4] || '',
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