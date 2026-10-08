import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface RphRequestData {
  action: string;
  prompt: string;
  arahan_tambahan: string;
  endpoint_url?: string;
}

@Component({
  selector: 'app-rph-bulk',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './rph-bulk.component.html',
  styleUrls: ['./rph-bulk.component.css']
})
export class RphBulkComponent implements OnInit {
  private defaultScriptUrl = 'https://script.google.com/macros/s/AKfycbzJlP_fwJE8qjPAl4Spqk0FMapAFLdr6tdK20e65Zt-fKUOIhG5PX_x5aoMfSn0opI2hA/exec';
  private liteScriptUrl = 'https://script.google.com/macros/s/AKfycbyKzfU6IJtnaWqKKPkrlqp55YFIpXG8PJJ0CllraZFjCI3thWCeg6QZ2crt5o_WSEPe7g/exec';

  isLoading = false;
  responseMessage = '';
  isError = false;
  viewMode: 'web' | 'print' = 'web';

  rawHtmlTemplate = '';
  renderedTemplate: SafeHtml = '';
  
  // Simpan data array asal RPH untuk kegunaan eksport Word & PDF
  rphDataList: any[] = [];

  selectedModel: 'standard' | 'lite' = 'lite';

  formData: RphRequestData = {
    action: 'generate_rph',
    prompt: 'Tulis Jawi. Jana 10 RPH secara pukal untuk subjek Bahasa Arab Tahun 4 dari Unit 1 hingga Unit 10.',
    arahan_tambahan: 'Pilih mana-mana topik yang sesuai mengikut DSKP Tahun 4 dan pastikan elemen nilai murni diberi penekanan.'
  };

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.http.get('assets/rph-template.html', { responseType: 'text' }).subscribe({
      next: (html) => {
        this.rawHtmlTemplate = html;
        this.renderHtml([]);
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

    const targetUrl = this.selectedModel === 'lite' ? this.liteScriptUrl : this.defaultScriptUrl;
    this.formData.endpoint_url = targetUrl;

    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    this.http.post(targetUrl, JSON.stringify(this.formData), { headers }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          let rawData = res.data;
          if (rawData && rawData.rph_list && Array.isArray(rawData.rph_list)) {
            rawData = rawData.rph_list;
          }

          const rphList = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);
          this.rphDataList = rphList; // Simpan rphDataList untuk Word & PDF
          this.responseMessage = `Berjaya menjana ${rphList.length} RPH menggunakan Gemini (${this.selectedModel === 'lite' ? 'Lite' : 'Standard'})!`;
          this.isError = false;
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

  // Render untuk Paparan Web & Cetakan Browser
  renderHtml(dataInput: any): void {
    if (!this.rawHtmlTemplate) return;

    let rphList: any[] = [];
    if (Array.isArray(dataInput)) {
      rphList = dataInput;
    } else if (dataInput && dataInput.rph_list && Array.isArray(dataInput.rph_list)) {
      rphList = dataInput.rph_list;
    } else if (dataInput && Object.keys(dataInput).length > 0) {
      rphList = [dataInput];
    }

    this.rphDataList = rphList;

    if (rphList.length === 0) {
      this.renderedTemplate = '';
      return;
    }

    const htmlOutputs = rphList.map((data) => {
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

      return `<div class="page-a4">${html}</div>`;
    });

    const combinedHtml = htmlOutputs.join('\n');
    this.renderedTemplate = this.sanitizer.bypassSecurityTrustHtml(combinedHtml);
  }

  // Cetak KESEMUA 10 Halaman PDF dengan rapat ke atas
  exportPdf(): void {
    const printStyle = document.createElement('style');
    printStyle.id = 'dynamic-print-style';
    printStyle.innerHTML = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0 !important; /* Buang margin cetak pelayar */
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body * {
          visibility: hidden !important;
        }

        /* Tampilkan bekas paparan RPH sahaja */
        .page-a4, .page-a4 * {
          visibility: visible !important;
        }

        /* Guanakan relative supaya semua RPH dapat disusun mengikut urutan berasingan */
        .page-a4 {
          position: relative !important;
          display: block !important;
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 auto !important;
          padding: 5mm 8mm 5mm 8mm !important; /* Jarak atas 5mm sahaja */
          box-sizing: border-box !important;
          background-color: #ffffff !important;
          box-shadow: none !important;
          page-break-after: always !important; /* Pemisah helaian PDF */
          break-after: page !important;
        }

        /* Hilangkan margin atas pada jadual RPH pertama dalam setiap halaman */
        .page-a4 > *:first-child,
        .page-a4 table:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
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
    if (!this.rphDataList || this.rphDataList.length === 0) {
      console.error('Kandungan RPH tidak dijumpai untuk dieksport.');
      return;
    }

    const wordHtmlPages = this.rphDataList.map((data) => this.generateWordTableHtml(data)).join(
      '<br style="page-break-before: always; mso-break-type: page-break;" />\n'
    );

    const wordDocumentContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'
            lang='ms-Arab' dir='rtl'>
      <head>
        <meta charset='utf-8'>
        <title>Rancangan Pengajaran Harian (A4)</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 210mm 297mm;
            margin: 10mm;
            mso-page-orientation: portrait;
          }
          @page WordSection1 {
            size: 595.3pt 841.9pt;
            margin: 28.3pt 28.3pt 28.3pt 28.3pt;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body, table, td, span, p {
            font-family: 'Traditional Arabic', 'Amiri', 'Sakkal Majalla', 'Arial', sans-serif !important;
            direction: rtl !important;
            unicode-bidi: embed !important;
            font-feature-settings: "liga" 1, "calt" 1;
          }
          body {
            background-color: #ffffff;
            margin: 0;
            padding: 0;
          }
          table {
            border-collapse: collapse !important;
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
          }
          td {
            padding: 4pt 6pt;
            vertical-align: top;
          }
          .bg-blue-header {
            background-color: #3b71ca !important;
            color: #ffffff !important;
            font-weight: bold;
            text-align: center;
          }
        </style>
      </head>
      <body dir='rtl' lang='ms-Arab'>
        <div class="WordSection1">
          ${wordHtmlPages}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordDocumentContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RPH_Gemini_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Bina HTML Table Khas MS Word
  private generateWordTableHtml(data: any): string {
    const aktivitiText = Array.isArray(data.aktiviti || data.aktiviti_p_dan_p)
      ? (data.aktiviti || data.aktiviti_p_dan_p).join('<br>')
      : (data.aktiviti || data.aktiviti_p_dan_p || '');

    return `
      <table border="1" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1.5pt solid #000000; font-family: 'Traditional Arabic', 'Amiri', sans-serif; direction: rtl; margin-bottom: 0px;">
        <!-- Header Tajuk Utama -->
        <tr>
          <td colspan="3" class="bg-blue-header" style="background-color: #3b71ca; color: #ffffff; text-align: center; font-size: 18pt; font-weight: bold; padding: 8pt; border-bottom: 1.5pt solid #000000;">
            رنچڠن ڤڠجرن هارين
          </td>
        </tr>

        <!-- Baris 1: Minggu, Tarikh, Hari -->
        <tr>
          <td style="width: 35%; border-bottom: 1.5pt solid #000000; border-left: 1.5pt solid #000000; padding: 6pt; font-weight: bold;">
            ميڠݢو : ${data.minggu || ''}
          </td>
          <td style="width: 35%; border-bottom: 1.5pt solid #000000; border-left: 1.5pt solid #000000; padding: 6pt; font-weight: bold;">
            تاريخ : ${data.tarikh || data.tarikh_dan_masa || ''}
          </td>
          <td style="width: 30%; border-bottom: 1.5pt solid #000000; padding: 6pt; font-weight: bold;">
            هاري : ${data.hari || ''}
          </td>
        </tr>

        <!-- Pembahagi Melintang -->
        <tr>
          <td colspan="3" style="height: 4pt; background-color: #ffffff; border-bottom: 1.5pt solid #000000;"></td>
        </tr>

        <!-- Bahagian Tengah -->
        <tr>
          <!-- Lajur Kanan -->
          <td style="width: 30%; border-left: 1.5pt solid #000000; border-bottom: 1.5pt solid #000000; vertical-align: top; padding: 0;">
            <table border="0" cellspacing="0" cellpadding="6" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="background-color: #e7e4cf; border-bottom: 1.5pt solid #000000; font-weight: bold;">
                  ڤلاجرن / بيدڠ :
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; height: 80pt;">
                  ${data.pelajaran || data.subjek || ''}
                </td>
              </tr>
              <tr>
                <td style="background-color: #e3d297; border-bottom: 1.5pt solid #000000; font-weight: bold;">
                  كلاس / تاهون :
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; height: 90pt;">
                  ${data.kelas || ''}
                </td>
              </tr>
              <tr>
                <td style="background-color: #9fccaa; border-bottom: 1.5pt solid #000000; font-weight: bold;">
                  ماس :
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; height: 35pt;">
                  ${data.masa_gabung || ''}
                </td>
              </tr>
              <tr>
                <td style="background-color: #a4c2f4; border-bottom: 1.5pt solid #000000; font-weight: bold;">
                  نيلاي مورني :
                </td>
              </tr>
              <tr>
                <td style="height: 60pt;">
                  ${data.nilai_murni || ''}
                </td>
              </tr>
            </table>
          </td>

          <!-- Lajur Kiri -->
          <td colspan="2" style="width: 70%; border-bottom: 1.5pt solid #000000; vertical-align: top; padding: 0;">
            <table border="0" cellspacing="0" cellpadding="6" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; font-weight: bold;">
                  تاجوق : ${data.tajuk || data.tajuk_dan_topik || ''}
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; font-weight: bold;">
                  ايسي : ${data.isi || ''}
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; height: 110pt;">
                  <b>اوبجيكتيف :</b> ${data.objektif || data.objektif_pembelajaran || ''}
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000; height: 120pt;">
                  <b>اكتيويتي :</b><br>${aktivitiText}
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1.5pt solid #000000;">
                  <b>اي بي ايم :</b> ${data.abm || data.bahan_bantu_mengajar || ''}
                </td>
              </tr>
              <tr>
                <td style="height: 60pt;">
                  <b>ريفليكسي :</b> ${data.refleksi || ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bahagian Bawah -->
        <tr>
          <td colspan="3" style="padding: 0;">
            <table border="0" cellspacing="0" cellpadding="6" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td colspan="2" style="border-bottom: 1.5pt solid #000000; height: 50pt;">
                  <b>چاتتن :</b> ${data.catatan || ''}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border-bottom: 1.5pt solid #000000; height: 40pt; font-weight: bold;">
                  تندا تاڠن ݢورو :
                </td>
              </tr>
              <tr>
                <td style="width: 40%; border-left: 1.5pt solid #000000; height: 50pt;">
                  <b>اولسن :</b> ${data.ulasan || ''}
                </td>
                <td style="width: 60%; height: 50pt; font-weight: bold;">
                  تندا تاڠن ڤڠتوا دان چوڤ :
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }
}