import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Subjek {
  nama_subjek: string;
  topik: string;
}

interface RphData {
  user_id: number;
  tarikh: string;
  masa_mula: string;
  masa_tamat: string;
  hari: string;
  minggu: string;
  tajuk: string;
  pelajaran: string;
  isi: string;
  objektif: string;
  kelas: string;
  aktiviti: string;
  abm: string;
  nilai_murni: string;
  refleksi: string;
  catatan: string;
  ulasan: string;
  senarai_subjek: Subjek[];
}

@Component({
  selector: 'app-rph',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './rph.component.html',
  styleUrls: ['./rph.component.css']
})
export class RphComponent implements OnInit {

  // URL Target Google Apps Script Web App
  private webAppUrl = 'https://script.google.com/macros/s/AKfycbyOHOond3DJgl9JvXUyFCoToqdGkEMUWPNurXTt8XKDfHANIWZQmuK7MR7YRzwQ5dQGCA/exec';
  
  // URL CSV Jadual Sekolah
  private csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=2064660124&single=true&output=csv';

  // Inject HttpClient
  private http = inject(HttpClient);

  rph: RphData = {
    user_id: 101,
    tarikh: '2026-10-04',
    masa_mula: '08:00',
    masa_tamat: '10:00',
    hari: 'Ahad',
    minggu: '40',
    tajuk: 'Pendaraban Nombor Bulat',
    pelajaran: 'Matematik',
    isi: 'Konsep Asas Pendaraban',
    objektif: 'Murid dapat menjawab 5/5 soalan darab dengan betul.',
    kelas: '4 Mawar',
    aktiviti: 'Penerangan konsep, Latihan kumpulan, Pembentangan jawapan.',
    abm: 'Kad Nombor, Papan Whiteboard',
    nilai_murni: 'Tekun, Bekerjasama',
    refleksi: '28 daripada 30 murid menguasai objektif.',
    catatan: '2 murid diberi latihan bimbingan susulan.',
    ulasan: '',
    senarai_subjek: [
      { nama_subjek: 'Matematik', topik: 'Pendaraban Nombor Bulat' },
      { nama_subjek: 'Sains', topik: 'Sistem Pencernaan' }
    ]
  };

  jadualSekolah: string[][] = [];
  isSubmitting = false;
  responseResult: any = null;
  errorMessage = '';

  ngOnInit(): void {
    this.muatNaikJadualCSV();
  }

  // Muat naik CSV Jadual
  muatNaikJadualCSV(): void {
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.jadualSekolah = this.parseCSV(data);
      },
      error: (err) => {
        console.error('Gagal memuat naik data jadual CSV:', err);
      }
    });
  }

  private parseCSV(data: string): string[][] {
    const lines = data.split('\n');
    return lines.map(line => line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
  }

  // Tambah subjek (max 15)
  tambahSubjek(): void {
    if (this.rph.senarai_subjek.length < 15) {
      this.rph.senarai_subjek.push({ nama_subjek: '', topik: '' });
    } else {
      alert('Maksimum 15 subjek sahaja dibenarkan.');
    }
  }

  // Padam subjek (min 1)
  padamSubjek(index: number): void {
    if (this.rph.senarai_subjek.length > 1) {
      this.rph.senarai_subjek.splice(index, 1);
    } else {
      alert('Sekurang-kurangnya 1 subjek diperlukan.');
    }
  }

  // Validasi borang
  validasiBorang(): boolean {
    if (!this.rph.user_id || !this.rph.tarikh || !this.rph.masa_mula || !this.rph.masa_tamat) {
      this.errorMessage = 'Sila lengkapkan user_id, tarikh, masa_mula, dan masa_tamat.';
      return false;
    }

    if (this.rph.senarai_subjek.length < 1 || this.rph.senarai_subjek.length > 15) {
      this.errorMessage = 'Bilangan subjek mestilah antara 1 hingga 15.';
      return false;
    }

    for (let i = 0; i < this.rph.senarai_subjek.length; i++) {
      const item = this.rph.senarai_subjek[i];
      if (!item.nama_subjek.trim() || !item.topik.trim()) {
        this.errorMessage = `Sila isikan nama subjek dan topik bagi item ke-${i + 1}.`;
        return false;
      }
      if (item.topik.length > 200) {
        this.errorMessage = `Topik bagi subjek ke-${i + 1} melebihi had maksimum 200 aksara.`;
        return false;
      }
    }

    this.errorMessage = '';
    return true;
  }

  // Hantar data melalui POST ke Apps Script
  simpanData(): void {
    if (!this.validasiBorang()) return;

    this.isSubmitting = true;
    this.responseResult = null;

    this.http.post(this.webAppUrl, JSON.stringify(this.rph), {
      headers: { 'Content-Type': 'text/plain' }
    }).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.responseResult = res;
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error POST:', err);
        alert('Data telah dihantar ke Apps Script.');
      }
    });
  }

  // Cetak ke PDF
  cetakPDF(): void {
    window.print();
  }

  // Eksport ke Microsoft Word
  eksportKeWord(): void {
    const printElement = document.getElementById('rph-jawi-print-area');
    if (!printElement) return;

    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>رنچڠن فڠجرن هارين</title>
        <style>
          body { font-family: 'Amiri', 'Traditional Arabic', Arial, sans-serif; direction: rtl; text-align: right; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
          h2, h3 { text-align: center; }
        </style>
      </head>
      <body>
        ${printElement.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RPH_Jawi_${this.rph.tarikh}_User${this.rph.user_id}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}