import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface RphRequestData {
  action: string;
  prompt: string;
  arahan_tambahan: string;
  endpoint_url?: string; // Menambah pilihan URL endpoint
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
  // Senarai URL pilihan Gemini API
  private defaultScriptUrl = 'https://script.google.com/macros/s/AKfycbzjLq8T1jJjKjWDe_KVwIqAPaxeR04k1c2fCBwzYKDwjN0uMzrCbzfgG2IEdrJeXHk-mA/exec';
  private liteScriptUrl = 'https://script.google.com/macros/s/AKfycbyHtTe6ds_D1ZPVU3vBuECoRM8vE8ywWkxGFkGkge0ooUHIJhsQbvCpvfpdNt77d2I3dQ/exec';

  isLoading = false;
  responseMessage = '';
  isError = false;
  viewMode: 'web' | 'print' = 'web';

  // Raw HTML dari rph-template.html
  rawHtmlTemplate = '';
  
  // Safe HTML untuk paparan Angular innerHTML
  renderedTemplate: SafeHtml = '';

  // Model terpilih (Pilihan lalai: 'lite')
  selectedModel: 'standard' | 'lite' = 'lite';

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
        this.renderHtml([]); // Render awal kosong
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

    // Tentukan URL sasaran berdasarkan pilihan pengguna (Standard vs Gemini Lite)
    const targetUrl = this.selectedModel === 'lite' ? this.liteScriptUrl : this.defaultScriptUrl;

    // Masukkan info model URL ke dalam payload jika perlu
    this.formData.endpoint_url = targetUrl;

    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    this.http.post(targetUrl, JSON.stringify(this.formData), { headers }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          // Terima res.data sebagai array (menyokong sehingga 30 RPH)
          const rphList = Array.isArray(res.data) ? res.data : [res.data];
          
          this.responseMessage = `Berjaya menjana ${rphList.length} RPH menggunakan Gemini (${this.selectedModel === 'lite' ? 'Lite' : 'Standard'})!`;
          this.isError = false;

          // Hantar senarai array RPH ke renderHtml
          this.renderHtml(rphList);
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

  // Fungsi menggantikan tempat pemegang data dalam templat HTML bagi senarai array RPH
  renderHtml(dataInput: any): void {
    if (!this.rawHtmlTemplate) return;

    // Pastikan dataInput bertukar ke bentuk Array (menyokong sehingga 30 keping RPH)
    const rphList: any[] = Array.isArray(dataInput)
      ? dataInput
      : (dataInput && Object.keys(dataInput).length > 0 ? [dataInput] : []);

    if (rphList.length === 0) {
      this.renderedTemplate = '';
      return;
    }

    // Loop melalui setiap RPH, gantikan placeholder, dan gabungkan hasilnya
    const fullHtmlOutput = rphList.map((data) => {
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

      // Setiap RPH dibungkus supaya ada pemisah halaman semasa cetakan / PDF / Word
      return `<div class="rph-single-item" style="page-break-after: always; margin-bottom: 20px;">${html}</div>`;
    }).join('\n');

    this.renderedTemplate = this.sanitizer.bypassSecurityTrustHtml(fullHtmlOutput);
  }

  exportPdf(): void {
    const printStyle = document.createElement('style');
    printStyle.id = 'dynamic-print-style';
    printStyle.innerHTML = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0mm;
        }
        body {
          background-color: #ffffff !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
        .page-a4 {
          background-color: #ffffff !important;
          margin: 0 auto !important;
          box-shadow: none !important;
        }
        .rph-single-item {
          page-break-after: always !important;
          break-after: page !important;
        }
      }
    `;
    document.head.appendChild(printStyle);

    window.print();

    setTimeout(() => {
      const injectedStyle = document.getElementById('dynamic-print-style');
      if (injectedStyle) {
        injectedStyle.remove();
      }
    }, 1000);
  }

  exportWord(): void {
    const printElement = document.getElementById('rendered-rph-container');
    if (!printElement || !printElement.innerHTML.trim()) {
      console.error('Kandungan RPH tidak dijumpai untuk dieksport.');
      return;
    }

    this.http.get('assets/rph-template.html', { responseType: 'text' }).subscribe({
      next: (templateHtml) => {
        this.generateWordDocument(templateHtml, printElement.innerHTML);
      },
      error: () => {
        this.http.get('rph-template.html', { responseType: 'text' }).subscribe({
          next: (templateHtml) => {
            this.generateWordDocument(templateHtml, printElement.innerHTML);
          },
          error: (e) => {
            console.error('Gagal memuat turun rph-template.html, menggunakan CSS asas.', e);
            this.generateWordDocument('', printElement.innerHTML);
          }
        });
      }
    });
  }

  private generateWordDocument(templateHtml: string, innerContent: string): void {
    let extractedStyles = '';
    if (templateHtml) {
      const styleMatches = templateHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        extractedStyles = styleMatches.join('\n');
      }
    }

    const wordStyles = `
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.rtl.min.css">
      ${extractedStyles}
      <style>
        @page WordSection1 {
          size: 210mm 297mm;
          margin: 10mm;
        }
        div.WordSection1 {
          page: WordSection1;
        }
        body {
          font-family: 'Traditional Arabic', 'Amiri', 'Sakkal Majalla', Tahoma, sans-serif;
          direction: rtl;
          text-align: right;
          background-color: #ffffff;
        }
        .page-a4 {
          width: 210mm;
          min-height: 297mm;
          background-color: #e8f1f5;
          padding: 10mm;
          box-shadow: none !important;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          direction: rtl;
        }
        .rph-single-item {
          page-break-after: always;
        }
        .b-all { border: 1.5px solid #000000 !important; }
        .b-top { border-top: 1.5px solid #000000 !important; }
        .b-bottom { border-bottom: 1.5px solid #000000 !important; }
        .b-left { border-left: 1.5px solid #000000 !important; }
        .b-right { border-right: 1.5px solid #000000 !important; }
        .bg-blue-header { background-color: #3b71ca !important; color: #ffffff; }
        .bg-yellow-kat { background-color: #e3d297 !important; }
        .bg-green-kat { background-color: #9fccaa !important; }
        .bg-blue-kat { background-color: #a4c2f4 !important; }
        .text-jawi { font-size: 1.2rem; font-weight: bold; }
      </style>
    `;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>RPH Document</title>
        ${wordStyles}
      </head>
      <body>
        <div class="WordSection1">
    `;

    const footer = `
        </div>
      </body>
      </html>
    `;

    const sourceHTML = header + innerContent + footer;

    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RPH_Gemini_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}