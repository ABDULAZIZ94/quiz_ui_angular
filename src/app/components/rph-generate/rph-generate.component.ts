import { Component, OnInit, Input, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RphService, ScheduleTopicMapping } from '../../services/rph.service';

export interface RphGeneratedItem {
  hari: string;
  tarikh: string;
  minggu: string;
  tajuk: string;
  pelajaran_bidang: string;
  isi: string;
  objektif: string;
  kelas_tahun: string;
  aktiviti: string;
  masa: string;
  abm: string;
  nilai_murni: string;
  refleksi: string;
  catatan: string;
  tanda_tangan_guru?: string;
  ulasan_penyelia?: string;
}

@Component({
  selector: 'app-rph-generate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rph-generate.component.html',
  styleUrls: ['./rph-generate.component.css']
})
export class RphGenerateComponent implements OnInit {
  private rphService = inject(RphService);
  private destroyRef = inject(DestroyRef);

  @Input() topicData: ScheduleTopicMapping | null = null;

  selectedLanguage: 'ms' | 'en' | 'ar' | 'jawi' = 'jawi';
  isLoading: boolean = false;
  errorMessage: string = '';

  // Senarai RPH yang dijana dari Gemini
  rphList: RphGeneratedItem[] = [];

  ngOnInit(): void {
    // Ambil data dari @Input() atau dapatkan dari RphService
    const activeData = this.topicData || this.rphService.getTopicData();

    if (activeData && activeData.items && activeData.items.length > 0) {
      this.janaRph(activeData);
    } else {
      this.errorMessage = 'Tiada data topik dijumpai. Sila pastikan anda telah menyimpan topik di Langkah 2.';
    }
  }

  janaRph(customData?: ScheduleTopicMapping): void {
    // Gunakan parameter, atau property topicData, atau ambil terus dari Service
    const payloadData = customData || this.topicData || this.rphService.getTopicData();

    if (!payloadData || !payloadData.items || payloadData.items.length === 0) {
      this.errorMessage = 'Tiada data topik disediakan untuk menjana RPH.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      ...payloadData,
      language: this.selectedLanguage
    };

    this.rphService.generateRphFromGemini(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res && res.data) {
            this.rphList = Array.isArray(res.data) ? res.data : [res.data];
          } else {
            this.errorMessage = 'Gagal memproses jawapan dari pelayan AI.';
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error('Ralat Jana RPH:', err);
          this.errorMessage = 'Berlaku ralat semasa menghubungi perkhidmatan Gemini.';
        }
      });
  }

  tukarBahasa(lang: 'ms' | 'en' | 'ar' | 'jawi'): void {
    this.selectedLanguage = lang;
    const activeData = this.topicData || this.rphService.getTopicData();
    if (activeData) {
      this.janaRph(activeData);
    }
  }

  // --- Fungsi Simpan PDF (Native Window Print) ---
  exportToPdf(): void {
    window.print();
  }

  // --- Fungsi Simpan Word (.doc Native HTML Blob) ---
  exportToWord(): void {
    const element = document.getElementById('rph-print-area');
    if (!element) return;

    const isRtl = this.selectedLanguage === 'ar' || this.selectedLanguage === 'jawi';
    const htmlHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Rancangan Pengajaran Harian</title>
        <style>
          body { font-family: 'Amiri', 'Traditional Arabic', 'Calibri', sans-serif; direction: ${isRtl ? 'rtl' : 'ltr'}; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          td, th { border: 1px solid #000; padding: 8px; vertical-align: top; }
          .text-center { text-align: center; }
          .header-title { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 15px; }
        </style>
      </head>
      <body>
    `;
    const htmlFooter = '</body></html>';
    const sourceHTML = htmlHeader + element.innerHTML + htmlFooter;

    const blob = new Blob(['\ufeff' + sourceHTML], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RPH_${this.selectedLanguage.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}