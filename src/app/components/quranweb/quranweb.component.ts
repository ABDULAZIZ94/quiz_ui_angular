import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export interface AyatQuran {
  surahNo: string;
  ayatNo: string;
  teksArab: string;
  terjemahan: string;
}

@Component({
  selector: 'app-quranweb',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './quranweb.component.html',
  styleUrls: ['./quranweb.component.css']
})
export class QuranwebComponent implements OnInit {
  csvUrl: string = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS91-d01z7LUoPmnmxiBE_7gbBlAaRZcgjcQk8A9X3KE1b7UDc32-e5ylGxlPetbljIywgT3zsk3izV/pub?gid=708503811&single=true&output=csv';
  storageKey: string = 'quran_data_cache';
  
  senaraiAyat: AyatQuran[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.muatDataQuran();
  }

  muatDataQuran(): void {
    // 1. Semak sama ada data sudah wujud dalam localStorage browser
    const cachedData = localStorage.getItem(this.storageKey);

    if (cachedData) {
      console.log('Menggunakan data daripada localStorage');
      this.senaraiAyat = JSON.parse(cachedData);
    } else {
      // 2. Jika tiada, muat turun CSV daripada URL
      this.fetchAndSaveCsv();
    }
  }

  fetchAndSaveCsv(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (dataCsv: string) => {
        this.senaraiAyat = this.parseCsvData(dataCsv);
        
        // Simpan data yang diproses ke dalam localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(this.senaraiAyat));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ralat semasa memuat turun data CSV:', err);
        this.errorMessage = 'Gagal memuat turun data Quran. Sila cuba lagi.';
        this.isLoading = false;
      }
    });
  }

  parseCsvData(csvText: string): AyatQuran[] {
    const lines = csvText.split('\n');
    const result: AyatQuran[] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Berdasarkan format data (dipisahkan oleh TAB / '\t'):
      // Kolom 1: 9|34|Teks Arab
      // Kolom 2: 9|34|Terjemahan
      const columns = line.split('\t');

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

  // Fungsi untuk padam cache dan muat semula data dari server
  padamCacheAndReload(): void {
    localStorage.removeItem(this.storageKey);
    this.senaraiAyat = [];
    this.fetchAndSaveCsv();
  }
}