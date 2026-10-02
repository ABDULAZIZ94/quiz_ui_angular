import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface SlideItem {
  sid: string;          // ID / Kumpulan slaid
  name: string;
  topic: string;
  pageType: string;
  title: SafeHtml;
  content: SafeHtml;
  bulletPoints?: SafeHtml[];
  isNumbered?: boolean;
}

export interface GroupedSlide {
  sid: string;
  slides: SlideItem[];
}

@Component({
  selector: 'app-quiz-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-slider.component.html',
  styleUrls: ['./quiz-slider.component.css']
})
export class QuizSliderComponent implements OnInit {
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=1845049912&single=true&output=csv';

  allSlides: SlideItem[] = [];
  groupedSlides: GroupedSlide[] = [];
  filteredSlides: SlideItem[] = [];
  
  slideSids: string[] = [];
  selectedSid = 'ALL';

  currentIndex = 0;
  loading = true;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.fetchCsvData();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === 'Space') {
      this.nextSlide();
    } else if (event.key === 'ArrowLeft') {
      this.prevSlide();
    }
  }

  fetchCsvData(): void {
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (csvData) => {
        if (!csvData || !csvData.trim()) {
          this.errorMessage = 'Data CSV didapati kosong.';
          this.loading = false;
          return;
        }
        this.parseCsvText(csvData);
        this.loading = false;
      },
      error: (err) => {
        console.error('Ralat muat turun CSV:', err);
        this.errorMessage = 'Gagal memuat turun data CSV daripada Google Sheets.';
        this.loading = false;
      }
    });
  }

  cleanAndFormatHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/,(\s*,)+/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/\\n/g, '<br>')
      .replace(/\r\n|\r|\n/g, '<br>')
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
      .trim();
  }

  parseCsvText(text: string): void {
    const lines = this.splitCsvLines(text);
    if (lines.length < 2) {
      this.errorMessage = 'Tiada baris data ditemui dalam CSV.';
      return;
    }

    const headers = this.parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
    const parsedSlides: SlideItem[] = [];
    const sidSet = new Set<string>();

    const sidIdx = headers.findIndex(h => h === 'sid' || h === 'id' || h.includes('sid'));
    const nameIdx = headers.findIndex(h => h === 'name' || h.includes('nama'));
    const topicIdx = headers.findIndex(h => h.includes('topic') || h.includes('topik'));
    const pageTypeIdx = headers.findIndex(h => h.includes('pagetype') || h.includes('type'));
    const data1Idx = headers.findIndex(h => h === 'data1' || h.includes('content') || h.includes('kandungan') || h.includes('data'));

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvRow(lines[i]);
      if (values.length === 0) continue;

      const rawSid = (sidIdx !== -1 ? values[sidIdx] : values[0]) || `SID-${i}`;
      const rawName = (nameIdx !== -1 ? values[nameIdx] : values[1]) || `Slaid ${i}`;
      const rawTopic = (topicIdx !== -1 ? values[topicIdx] : values[2]) || 'Umum';
      const pageType = (pageTypeIdx !== -1 ? values[pageTypeIdx] : values[3]) || 'normal';
      const rawData1 = (data1Idx !== -1 ? values[data1Idx] : values[4]) || '';

      const cleanSid = rawSid.replace(/^["'\s]+|["'\s]+$/g, '').trim();
      const cleanName = rawName.replace(/^["'\s]+|["'\s]+$/g, '').trim();
      const cleanTopic = rawTopic.replace(/^["'\s]+|["'\s]+$/g, '').trim();

      if (cleanSid) sidSet.add(cleanSid);

      const formattedData1 = this.cleanAndFormatHtml(rawData1);
      let titleText = cleanName || cleanTopic;
      let contentText = formattedData1;
      let bulletPoints: SafeHtml[] | undefined;
      let isNumbered = false;

      if (pageType.toLowerCase().includes('list') || /\d+\.\s/.test(contentText)) {
        isNumbered = pageType.toLowerCase().includes('sorted') || /\d+\.\s/.test(contentText);
        const parts = contentText.split(/<br\s*\/?>/).map(p => p.trim()).filter(p => p.length > 0);

        if (parts.length > 1) {
          contentText = parts[0];
          bulletPoints = parts.slice(1).map(p => {
            const cleanPoint = p.replace(/^\d+\.\s*/, '');
            return this.sanitizer.bypassSecurityTrustHtml(cleanPoint);
          });
        }
      }

      parsedSlides.push({
        sid: cleanSid,
        name: cleanName,
        topic: cleanTopic,
        pageType: pageType,
        title: this.sanitizer.bypassSecurityTrustHtml(titleText),
        content: this.sanitizer.bypassSecurityTrustHtml(contentText),
        bulletPoints: bulletPoints && bulletPoints.length > 0 ? bulletPoints : undefined,
        isNumbered: isNumbered
      });
    }

    if (parsedSlides.length === 0) {
      this.errorMessage = 'Tiada data slaid berjaya diproses daripada format CSV.';
    } else {
      this.allSlides = parsedSlides;
      this.slideSids = Array.from(sidSet);
      this.filterSlides();
    }
  }

  splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') { i++; }
        if (currentLine.trim()) { lines.push(currentLine); }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) { lines.push(currentLine); }
    return lines;
  }

  parseCsvRow(rowText: string): string[] {
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

  onSidChange(): void {
    this.filterSlides();
  }

  filterSlides(): void {
    if (this.selectedSid === 'ALL') {
      this.filteredSlides = [...this.allSlides];
    } else {
      this.filteredSlides = this.allSlides.filter(s => s.sid === this.selectedSid);
    }
    this.currentIndex = 0;
  }

  nextSlide(): void {
    if (this.currentIndex < this.filteredSlides.length - 1) {
      this.currentIndex++;
    }
  }

  prevSlide(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  // Fungsi Lompat Slaid (Jump to 10, 20, 30, dsb.)
  jumpToSlide(index: number): void {
    if (index >= 0 && index < this.filteredSlides.length) {
      this.currentIndex = index;
    }
  }

  toggleFullscreen(): void {
    const elem = this.sliderContainer.nativeElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err: any) => alert(`Ralat: ${err.message}`));
    } else {
      document.exitFullscreen();
    }
  }

  // Cetak mengikut apa yang dipaparkan (displayed) pada slaid semasa / senarai tertapis
  // Cetak PDF: Memuatkan 2 slaid bagi setiap muka surat A4
  printToPdf(): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    let slidesHtml = '';
    this.filteredSlides.forEach((slide, idx) => {
      let pointsHtml = '';
      if (slide.bulletPoints && slide.bulletPoints.length > 0) {
        const tag = slide.isNumbered ? 'ol' : 'ul';
        const items = slide.bulletPoints.map(p => `<li>${(p as any).changingThisBreaksApplicationSecurity || p}</li>`).join('');
        pointsHtml = `<${tag}>${items}</${tag}>`;
      }

      slidesHtml += `
        <div class="pdf-slide">
          <div class="top-tag">SID: ${slide.sid} | ${slide.name} - ${slide.topic} (Slaid ${idx + 1})</div>
          <h2>${(slide.title as any).changingThisBreaksApplicationSecurity || slide.title}</h2>
          <div class="content">${(slide.content as any).changingThisBreaksApplicationSecurity || slide.content}</div>
          ${pointsHtml}
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Slaid Pembentangan</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #333;
            }
            .pdf-slide {
              height: 46vh; /* Memastikan setiap slaid mengambil separuh halaman A4 */
              box-sizing: border-box;
              border: 1px solid #cbd5e1;
              padding: 16px 20px;
              border-radius: 8px;
              margin-bottom: 12px;
              page-break-inside: avoid; /* Elakkan slaid terpotong di tengah */
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              overflow: hidden;
            }
            /* Setiap 2 slaid akan memaksa pertukaran halaman (page break) baru */
            .pdf-slide:nth-child(2n) {
              page-break-after: always;
              margin-bottom: 0;
            }
            .top-tag {
              color: #2563eb;
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            h2 {
              color: #0f172a;
              margin-top: 0;
              margin-bottom: 8px;
              font-size: 18px;
            }
            .content {
              font-size: 14px;
              line-height: 1.4;
              margin-bottom: 8px;
            }
            ul, ol {
              margin: 0;
              padding-left: 18px;
              font-size: 13px;
              line-height: 1.3;
            }
            li {
              margin-bottom: 3px;
            }
          </style>
        </head>
        <body>
          ${slidesHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Mendapatkan nama slaid yang sepadan dengan SID untuk dipaparkan pada dropdown
  getSlideNameBySid(sid: string): string {
    const found = this.allSlides.find(s => s.sid === sid);
    return found ? `${found.name} (SID: ${sid})` : `SID: ${sid}`;
  }
}