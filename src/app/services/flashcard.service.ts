import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word, VocabularyItem, VocabularyListResponse } from '../models/word.model';
import { environment } from '../../environments/environment';

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

  /**
   * Fetch vocabulary from API (http://localhost:8025/vocabulary/list)
   * and merge with static words. Call this on app init.
   */
  loadVocabulary(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<VocabularyListResponse>(`${this.quizApiUrl}/vocabulary/list`).subscribe({
      next: (res) => {
        const apiWords: Word[] = (res.data ?? []).map((item: VocabularyItem) => ({
          arabic: item.arabic,
          english: item.english,
          translit: item.transliteration,
          category: item.category,
          example: item.example,
        }));
        // Merge: static words + API words
        this.words.set([...this.staticWords, ...apiWords]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load vocabulary from API:', err);
        this.error.set('Failed to load vocabulary from API');
        this.loading.set(false);
        // Keep static words on error
      },
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
