import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AyatQuran {
  surahNo: string;
  ayatNo: string;
  teksArab: string;
  terjemahan: string;
}

@Component({
  selector: 'app-quranweb',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './quranweb.component.html',
  styleUrls: ['./quranweb.component.css']
})
export class QuranwebComponent implements OnInit {
  csvUrl: string = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS91-d01z7LUoPmnmxiBE_7gbBlAaRZcgjcQk8A9X3KE1b7UDc32-e5ylGxlPetbljIywgT3zsk3izV/pub?gid=708503811&single=true&output=csv';
  storageKey: string = 'quran_data_cache';
  hafalKey: string = 'quran_hafal_list';

  senaraiAyat: AyatQuran[] = [];
  senaraiAyatDitapis: AyatQuran[] = [];
  
  senaraiSurahNo: number[] = Array.from({ length: 114 }, (_, i) => i + 1);
  surahDipilih: number = 0;

  // Indeks ayat yang sedang dipaparkan
  currentIndex: number = 0;
  isFullscreen: boolean = false;

  // Set simpanan kunci ayat yang dah dihafal (Cth: "1:2" untuk Surah 1 Ayat 2)
  setHafal: Set<string> = new Set<string>();

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.muatHafalCache();
    this.muatDataQuran();
  }

  get ayatSemasa(): AyatQuran | null {
    if (this.senaraiAyatDitapis.length > 0 && this.currentIndex < this.senaraiAyatDitapis.length) {
      return this.senaraiAyatDitapis[this.currentIndex];
    }
    return null;
  }

  muatDataQuran(): void {
    const cachedData = localStorage.getItem(this.storageKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.senaraiAyat = parsed;
          this.susunDanTapisAyat();
          return;
        }
      } catch (e) {
        console.error('Cache ralat, memuat semula...', e);
      }
    }
    
    this.fetchAndSaveCsv();
  }

  fetchAndSaveCsv(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (dataCsv: string) => {
        this.senaraiAyat = this.parseCsvData(dataCsv);

        if (this.senaraiAyat.length > 0) {
          localStorage.setItem(this.storageKey, JSON.stringify(this.senaraiAyat));
          this.susunDanTapisAyat();
        } else {
          this.errorMessage = 'Data berjaya dimuat turun tetapi tiada rekod sah ditemui.';
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ralat CSV:', err);
        this.errorMessage = 'Gagal memuat turun data Quran. Sila cuba lagi.';
        this.isLoading = false;
      }
    });
  }

  parseCsvData(csvText: string): AyatQuran[] {
    const cleanCsv = csvText.replace(/\r/g, '');
    const lines = cleanCsv.split('\n');
    const result: AyatQuran[] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const cleanLine = line.replace(/^"(.*)"$/, '$1');
      let columns = cleanLine.includes('\t') ? cleanLine.split('\t') : cleanLine.split('","');

      if (columns.length < 2) {
        columns = cleanLine.split(',');
      }

      columns = columns.map(c => c.replace(/^"|"$/g, '').trim());

      if (columns.length >= 2) {
        const arabParts = columns[0].split('|');
        const malayParts = columns[1].split('|');

        if (arabParts.length >= 3 && malayParts.length >= 3) {
          result.push({
            surahNo: arabParts[0].trim(),
            ayatNo: arabParts[1].trim(),
            teksArab: arabParts[2].trim(),
            terjemahan: malayParts[2].trim()
          });
        }
      }
    }

    return result;
  }

  tukarSurah(): void {
    this.currentIndex = 0;
    this.susunDanTapisAyat();
  }

  susunDanTapisAyat(): void {
    let temp = [...this.senaraiAyat];

    temp.sort((a, b) => {
      const sA = Number(a.surahNo);
      const sB = Number(b.surahNo);
      if (sA !== sB) return sA - sB;
      return Number(a.ayatNo) - Number(b.ayatNo);
    });

    if (this.surahDipilih && Number(this.surahDipilih) !== 0) {
      temp = temp.filter(a => Number(a.surahNo) === Number(this.surahDipilih));
    }

    this.senaraiAyatDitapis = temp;
    if (this.currentIndex >= this.senaraiAyatDitapis.length) {
      this.currentIndex = 0;
    }
  }

  // Fungsi Navigasi (Menukar indeks tanpa trigger scroll)
  pilihAyat(index: number, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.currentIndex = index;
  }

  nextAyat(): void {
    if (this.currentIndex < this.senaraiAyatDitapis.length - 1) {
      this.currentIndex++;
    }
  }

  prevAyat(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  // Pengurusan Tanda Dah Hafal
  getAyatKey(item: AyatQuran): string {
    return `${item.surahNo}:${item.ayatNo}`;
  }

  isHafal(item: AyatQuran): boolean {
    return this.setHafal.has(this.getAyatKey(item));
  }

  toggleHafal(item: AyatQuran): void {
    const key = this.getAyatKey(item);
    if (this.setHafal.has(key)) {
      this.setHafal.delete(key);
    } else {
      this.setHafal.add(key);
    }
    localStorage.setItem(this.hafalKey, JSON.stringify(Array.from(this.setHafal)));
  }

  muatHafalCache(): void {
    const data = localStorage.getItem(this.hafalKey);
    if (data) {
      try {
        const list = JSON.parse(data);
        if (Array.isArray(list)) {
          this.setHafal = new Set(list);
        }
      } catch (e) {
        console.error('Ralat memuatkan cache hafal:', e);
      }
    }
  }

  padamCacheAndReload(): void {
    localStorage.removeItem(this.storageKey);
    this.senaraiAyat = [];
    this.senaraiAyatDitapis = [];
    this.currentIndex = 0;
    this.fetchAndSaveCsv();
  }
}