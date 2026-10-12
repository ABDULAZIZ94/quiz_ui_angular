import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

export interface FlashcardItem {
  bil?: number;
  arabic: string;
  urdu: string;
  english: string;
  malay: string;
  rohingya: string;
}

interface StoredData {
  timestamp: number;
  cards: FlashcardItem[];
}

@Component({
  selector: 'app-flashcard2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flashcard2.component.html',
  styleUrls: ['./flashcard2.component.css']
})
export class Flashcard2Component implements OnInit {

  @ViewChild('flashcardContainer') flashcardContainer!: ElementRef;

  private csvUrl = 'https://quizapi.ezcigu.online/quizcsv';
  private STORAGE_KEY = 'flashcard2_data';
  private ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  flashcards: FlashcardItem[] = [];
  currentIndex: number = 0;
  loading: boolean = true;
  errorMessage: string = '';
  currentlySpeaking: string | null = null;
  isFullscreen: boolean = false;
  
  availableVoices: SpeechSynthesisVoice[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFlashcards();
    this.initVoices();
  }

  // Muat senarai suara yang disokong oleh browser
  private initVoices(): void {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        this.availableVoices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  get currentCard(): FlashcardItem | null {
    return this.flashcards.length > 0 ? this.flashcards[this.currentIndex] : null;
  }

  private loadFlashcards(): void {
    const cachedData = localStorage.getItem(this.STORAGE_KEY);
    
    if (cachedData) {
      try {
        const parsed: StoredData = JSON.parse(cachedData);
        const now = Date.now();

        if (now - parsed.timestamp < this.ONE_WEEK_MS && parsed.cards && parsed.cards.length > 0) {
          this.flashcards = parsed.cards;
          this.loading = false;
          return;
        }
      } catch (e) {
        console.warn('Data cache rosak, memuat turun semula...');
      }
    }

    this.fetchCsvData();
  }

  private fetchCsvData(): void {
    this.loading = true;
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (csvText) => {
        this.parseCsv(csvText);
        this.loading = false;
      },
      error: (err) => {
        console.error('Ralat muat turun CSV:', err);
        this.errorMessage = 'Gagal memuat turun data kad kilat.';
        this.loading = false;
      }
    });
  }

  private parseCsv(csvText: string): void {
    const lines = this.splitCsvLines(csvText);
    if (lines.length < 2) {
      this.errorMessage = 'Data CSV kosong atau tidak sah.';
      return;
    }

    const headers = this.parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
    
    const arabicIdx = headers.findIndex(h => h.includes('arabic') || h.includes('arab'));
    const urduIdx = headers.findIndex(h => h.includes('urdu'));
    const engIdx = headers.findIndex(h => h.includes('eng') || h.includes('english'));
    const malayIdx = headers.findIndex(h => h.includes('malay') || h.includes('melayu'));
    const rohIdx = headers.findIndex(h => h.includes('roh') || h.includes('rohingya'));
    const dataIdx = headers.findIndex(h => h.includes('data') || h.includes('kandungan'));

    const items: FlashcardItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvRow(lines[i]);
      if (row.length === 0) continue;

      const defaultText = row[dataIdx !== -1 ? dataIdx : 0] || '';

      const item: FlashcardItem = {
        bil: i,
        arabic: (arabicIdx !== -1 ? row[arabicIdx] : defaultText).trim(),
        urdu: (urduIdx !== -1 ? row[urduIdx] : defaultText).trim(),
        english: (engIdx !== -1 ? row[engIdx] : defaultText).trim(),
        malay: (malayIdx !== -1 ? row[malayIdx] : defaultText).trim(),
        rohingya: (rohIdx !== -1 ? row[rohIdx] : defaultText).trim()
      };

      items.push(item);
    }

    this.flashcards = items;

    const cachePayload: StoredData = {
      timestamp: Date.now(),
      cards: this.flashcards
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cachePayload));
  }

  // Fungsi Text-To-Speech Suara Lelaki
  speak(text: string, langPrefix: string, langName: string): void {
    if (!('speechSynthesis' in window)) {
      alert('Maaf, pelayar anda tidak menyokong fungsi sebutan suara (Text-to-Speech).');
      return;
    }

    window.speechSynthesis.cancel();

    if (!text || text.trim() === '') return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Cari suara lelaki yang sepadan dengan bahasa
    if (this.availableVoices.length === 0) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }

    const maleVoice = this.availableVoices.find(v => 
      v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) && 
      (v.name.toLowerCase().includes('male') || 
       v.name.toLowerCase().includes('david') || 
       v.name.toLowerCase().includes('george') || 
       v.name.toLowerCase().includes('adam') || 
       v.name.toLowerCase().includes('stefan') || 
       v.name.toLowerCase().includes('pavel') || 
       v.name.toLowerCase().includes('raju') || 
       v.name.toLowerCase().includes('naayf') ||
       v.name.toLowerCase().includes('tarik'))
    ) || this.availableVoices.find(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));

    if (maleVoice) {
      utterance.voice = maleVoice;
      utterance.lang = maleVoice.lang;
    } else {
      utterance.lang = langPrefix;
    }

    // Rendahkan pitch untuk memberikan tona suara lelaki yang mantap
    utterance.pitch = 0.85; 
    utterance.rate = 0.9; // Kelajuan bacaan sederhana

    this.currentlySpeaking = langName;

    utterance.onend = () => this.currentlySpeaking = null;
    utterance.onerror = () => this.currentlySpeaking = null;

    window.speechSynthesis.speak(utterance);
  }

  // Fungsi Mod Skrin Penuh (Fullscreen)
  toggleFullscreen(): void {
    const elem = this.flashcardContainer.nativeElement;
    
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      this.isFullscreen = false;
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }

  // Navigasi Kad
  nextCard(): void {
    if (this.currentIndex < this.flashcards.length - 1) this.currentIndex++;
  }

  prevCard(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  goToFirstCard(): void {
    this.currentIndex = 0;
  }

  goToLastCard(): void {
    if (this.flashcards.length > 0) {
      this.currentIndex = this.flashcards.length - 1;
    }
  }

  goToCardNumber(num: number): void {
    const targetIndex = num - 1;
    if (targetIndex >= 0 && targetIndex < this.flashcards.length) {
      this.currentIndex = targetIndex;
    }
  }

  getShortcutNumbers(): number[] {
    const shortcuts: number[] = [];
    for (let i = 10; i <= this.flashcards.length; i += 10) {
      shortcuts.push(i);
    }
    return shortcuts;
  }

  refreshData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.fetchCsvData();
  }

  private splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') i++;
        if (currentLine.trim()) lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine);
    return lines;
  }

  private parseCsvRow(rowText: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}