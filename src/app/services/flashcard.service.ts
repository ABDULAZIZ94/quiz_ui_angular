import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word, VocabularyItem, VocabularyListResponse } from '../models/word.model';
import { environment } from '../../environments/environment';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

// Interface untuk data CSV Google Sheet
interface CsvWord {
  arabic: string;
  english: string;
  translit: string;
  category: string;
  example: string;
}



@Injectable({ providedIn: 'root' })
export class FlashcardService {
  private http = inject(HttpClient);
  private readonly quizApiUrl = environment.quizApiUrl;

  // Static words (built-in)
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

  // Combined words: static + API data
  readonly words = signal<Word[]>([...this.staticWords]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly currentIndex = signal(0);
  readonly isFlipped = signal(false);

  get currentWord(): Word {
    return this.words()[this.currentIndex()];
  }

  get total(): number {
    return this.words().length;
  }

  readonly progress = computed(() => ((this.currentIndex() + 1) / this.words().length) * 100);


loadVocabulary(): void {
  this.loading.set(true);
  this.error.set(null);

  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?output=csv';

  this.http.get<VocabularyListResponse>(`${this.quizApiUrl}/vocabulary/list`).pipe(
    // Chain ke HTTP call kedua (Google Sheets CSV)
    switchMap((res) => {
      const apiWords: Word[] = (res.data ?? []).map((item: VocabularyItem) => ({
        arabic: item.arabic,
        english: item.english,
        translit: item.transliteration,
        category: item.category,
        example: item.example,
      }));

      // Fetch CSV sebagai text
      return this.http.get(csvUrl, { responseType: 'text' }).pipe(
        map((csvData) => {
          const sheetWords = this.parseCsv(csvData);
          // Cantum: staticWords + apiWords + sheetWords
          return [...this.staticWords, ...apiWords, ...sheetWords];
        }),
        catchError((sheetErr) => {
          console.error('Failed to load Google Sheet CSV:', sheetErr);
          // Jika CSV gagal, teruskan dengan staticWords + apiWords
          return of([...this.staticWords, ...apiWords]);
        })
      );
    })
  ).subscribe({
    next: (allWords) => {
      this.words.set(allWords);
      this.loading.set(false);
    },
    error: (err) => {
      console.error('Failed to load API vocabulary:', err);
      this.error.set('Failed to load vocabulary');
      this.loading.set(false);
    },
  });
}

// Helper method untuk parse text CSV ke Word[]
private parseCsv(csvText: string): Word[] {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length <= 1) return []; // Abort jika fail kosong atau header sahaja

  // Asumsi susunan lajur CSV: arabic, english, transliteration, category, example
  // Abaikan baris pertama (header)
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());
    return {
      arabic: cols[0] || '',
      english: cols[1] || '',
      translit: cols[2] || '',
      category: cols[3] || '',
      example: cols[4] || '',
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
    this.currentIndex.set(index);
    this.isFlipped.set(false);
  }

  flip(): void {
    this.isFlipped.update((f) => !f);
  }

  speak(word?: Word): void {
    const w = word ?? this.currentWord;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(w.arabic);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.75;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  }
}
