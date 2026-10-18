import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
  // Menggunakan endpoint gabungan (complete qran) teks asal arab & terjemahan melayu
  private apiArabicUrl: string = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
  private apiMalayUrl: string = 'https://api.alquran.cloud/v1/quran/quran-melayu';
  
  storageKey: string = 'quran_data_cache';
  hafalKey: string = 'quran_hafal_list';

  senaraiAyat: AyatQuran[] = [];
  senaraiAyatDitapis: AyatQuran[] = [];
  
  senaraiSurahNo: number[] = Array.from({ length: 114 }, (_, i) => i + 1);
  surahDipilih: number = 0;

  currentIndex: number = 0;
  isFullscreen: boolean = false;

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
    
    this.fetchAndSaveFromApi();
  }

  // Menggantikan fungsi fetchAndSaveCsv lama
  fetchAndSaveFromApi(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Memanggil kedua-dua API teks arab dan terjemahan serentak
    const araRequest = this.http.get<any>(this.apiArabicUrl);
    const malRequest = this.http.get<any>(this.apiMalayUrl);

    forkJoin([araRequest, malRequest]).subscribe({
      next: ([arabicRes, malayRes]) => {
        if (arabicRes?.status === 'OK' && malayRes?.status === 'OK') {
          this.senaraiAyat = this.gabungDataApi(arabicRes.data, malayRes.data);

          if (this.senaraiAyat.length > 0) {
            localStorage.setItem(this.storageKey, JSON.stringify(this.senaraiAyat));
            this.susunDanTapisAyat();
          } else {
            this.errorMessage = 'Data berjaya dimuat turun tetapi gagal diproses.';
          }
        } else {
          this.errorMessage = 'Respons daripada API Al-Quran tidak sah.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ralat API Quran:', err);
        this.errorMessage = 'Gagal memuat turun data Quran daripada API. Sila cuba lagi.';
        this.isLoading = false;
      }
    });
  }

  // Fungsi utiliti baru untuk memetakan JSON API alquran.cloud ke struktur data anda
  private gabungDataApi(arabicData: any, malayData: any): AyatQuran[] {
    const result: AyatQuran[] = [];
    const surahsArabic = arabicData.surahs || [];
    const surahsMalay = malayData.surahs || [];

    // Loop setiap surah (1 hingga 114)
    for (let i = 0; i < surahsArabic.length; i++) {
      const sArab = surahsArabic[i];
      const sMalay = surahsMalay[i];

      if (!sArab || !sMalay) continue;

      // Loop setiap ayat dalam surah tersebut
      for (let j = 0; j < sArab.ayahs.length; j++) {
        const aArab = sArab.ayahs[j];
        const aMalay = sMalay.ayahs[j];

        if (aArab && aMalay) {
          result.push({
            surahNo: sArab.number.toString(),
            ayatNo: aArab.numberInSurah.toString(),
            teksArab: aArab.text,
            terjemahan: aMalay.text
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
    this.fetchAndSaveFromApi();
  }
}
