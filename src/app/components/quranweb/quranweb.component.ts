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
  
  senaraiAyat: AyatQuran[] = [];        // Data penuh
  senaraiAyatDitapis: AyatQuran[] = []; // Data selepas penapisan & penyusunan
  senaraiAyatDipapar: AyatQuran[] = []; // Data yang dipotong (slice) untuk paparan UI
  
  senaraiSurahNo: number[] = Array.from({ length: 114 }, (_, i) => i + 1);
  
  surahDipilih: number = 0;
  carianAyat: string = '';

  // Pagination / Had Paparan
  hadPaparan: number = 100;
  saizLangkah: number = 100; // Bilangan ayat ditambah setiap kali tekan 'Muat Lagi'

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.muatDataQuran();
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
    this.hadPaparan = 100; // Set semula had paparan ke 100 apabila bertukar penapis
    this.susunDanTapisAyat();
  }

  susunDanTapisAyat(): void {
    let temp = [...this.senaraiAyat];

    // 1. Susun ikut Surah (1 - 114) dan Ayat (1 - akhir)
    temp.sort((a, b) => {
      const sA = Number(a.surahNo);
      const sB = Number(b.surahNo);
      if (sA !== sB) {
        return sA - sB;
      }
      return Number(a.ayatNo) - Number(b.ayatNo);
    });

    // 2. Penapis Surah
    if (this.surahDipilih && Number(this.surahDipilih) !== 0) {
      temp = temp.filter(a => Number(a.surahNo) === Number(this.surahDipilih));
    }

    // 3. Penapis Ayat
    if (this.carianAyat && this.carianAyat.trim() !== '') {
      temp = temp.filter(a => a.ayatNo.toString().includes(this.carianAyat.trim()));
    }

    this.senaraiAyatDitapis = temp;
    this.kemaskiniPaparan();
  }

  kemaskiniPaparan(): void {
    // Hadkan paparan mengikut nilai 'hadPaparan'
    this.senaraiAyatDipapar = this.senaraiAyatDitapis.slice(0, this.hadPaparan);
  }

  // Fungsi Kawalan Paparan (Load & Unload)
  muatLagi(): void {
    this.hadPaparan += this.saizLangkah;
    this.kemaskiniPaparan();
  }

  muatSemua(): void {
    this.hadPaparan = this.senaraiAyatDitapis.length;
    this.kemaskiniPaparan();
  }

  kurangkanPaparan(): void {
    this.hadPaparan = 100;
    this.kemaskiniPaparan();
  }

  resetPenapis(): void {
    this.surahDipilih = 0;
    this.carianAyat = '';
    this.hadPaparan = 100;
    this.susunDanTapisAyat();
  }

  padamCacheAndReload(): void {
    localStorage.removeItem(this.storageKey);
    this.senaraiAyat = [];
    this.senaraiAyatDitapis = [];
    this.senaraiAyatDipapar = [];
    this.resetPenapis();
    this.fetchAndSaveCsv();
  }
}