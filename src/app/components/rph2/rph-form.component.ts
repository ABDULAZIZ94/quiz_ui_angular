import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface RphRequestData {
  action: string;
  prompt: string;
  arahan_tambahan: string;
}

@Component({
  selector: 'app-rph-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './rph-form.component.html',
  styleUrls: ['./rph-form.component.css']
})
export class RphFormComponent implements OnInit {
  private scriptUrl = 'https://script.google.com/macros/s/AKfycbwpGApeIt2UnetuiLOawmlzUb-85xMmOMER8bKdthKwr2eDBVUDoHdFgPchJvY0FTPzHQ/exec';

  isLoading = false;
  responseMessage = '';
  isError = false;
  viewMode: 'web' | 'print' = 'web';

  // Raw HTML dari rph-template.html
  rawHtmlTemplate = '';
  
  // Safe HTML untuk paparan Angular innerHTML
  renderedTemplate: SafeHtml = '';

  formData: RphRequestData = {
    action: 'generate_rph',
    prompt: 'Jana RPH untuk subjek Bahasa Melayu Tahun 4 untuk minggu ke-15.',
    arahan_tambahan: 'Pilih mana-mana topik yang sesuai mengikut DSKP Tahun 4 dan pastikan elemen nilai murni diberi penekanan.'
  };

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Muat turun fail templat HTML dari folder assets
    this.http.get('assets/rph-template.html', { responseType: 'text' }).subscribe({
      next: (html) => {
        this.rawHtmlTemplate = html;
        this.renderHtml({}); // Render awal kosong
      },
      error: (err) => {
        console.error('Gagal memuat turun assets/rph-template.html', err);
      }
    });
  }

  hantarData(): void {
    this.isLoading = true;
    this.responseMessage = '';
    this.isError = false;

    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    this.http.post(this.scriptUrl, JSON.stringify(this.formData), { headers }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.responseMessage = 'RPH berjaya dijana oleh Gemini AI!';
          this.isError = false;
          // Render HTML templat menggunakan data yang diterima
          this.renderHtml(res.data);
        } else {
          this.responseMessage = 'Ralat: ' + (res.message || 'Gagal menjana RPH.');
          this.isError = true;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.isError = true;
        this.responseMessage = 'Ralat Rangkaian: ' + err.message;
      }
    });
  }

  // Fungsi menggantikan tempat pemegang data dalam templat HTML
  renderHtml(data: any): void {
    if (!this.rawHtmlTemplate) return;

    let html = this.rawHtmlTemplate;

    const replaceMap: { [key: string]: string } = {
      '{{minggu}}': data.minggu || '',
      '{{tarikh}}': data.tarikh || data.tarikh_dan_masa || '',
      '{{hari}}': data.hari || '',
      '{{tajuk}}': data.tajuk || data.tajuk_dan_topik || '',
      '{{isi}}': data.isi || '',
      '{{objektif}}': data.objektif || data.objektif_pembelajaran || '',
      '{{aktiviti}}': Array.isArray(data.aktiviti || data.aktiviti_p_dan_p) 
                        ? (data.aktiviti || data.aktiviti_p_dan_p).join('<br>') 
                        : (data.aktiviti || data.aktiviti_p_dan_p || ''),
      '{{abm}}': data.abm || data.bahan_bantu_mengajar || '',
      '{{refleksi}}': data.refleksi || '',
      '{{pelajaran}}': data.pelajaran || data.subjek || '',
      '{{kelas}}': data.kelas || '',
      '{{masa}}': data.masa_gabung || (data.masa_mula ? `${data.masa_mula} - ${data.masa_tamat}` : ''),
      '{{nilai_murni}}': data.nilai_murni || '',
      '{{catatan}}': data.catatan || '',
      '{{ulasan}}': data.ulasan || ''
    };

    Object.keys(replaceMap).forEach((key) => {
      html = html.replace(new RegExp(key, 'g'), replaceMap[key]);
    });

    this.renderedTemplate = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  exportPdf(): void {
    window.print();
  }

  exportWord(): void {
    const printElement = document.getElementById('rendered-rph-container');
    if (!printElement) return;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>RPH Document</title></head><body>";
    
    const htmlContent = printElement.innerHTML;
    const footer = "</body></html>";
    const sourceHTML = header + htmlContent + footer;

    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RPH_Gemini_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}