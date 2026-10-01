import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface SlideItem {
  name: string;
  topic: string;
  pageType: string;
  title: SafeHtml;
  content: SafeHtml;
  bulletPoints?: SafeHtml[];
  isNumbered?: boolean;
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
  filteredSlides: SlideItem[] = [];
  slideNames: string[] = [];
  selectedName = 'ALL';

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

  // Fungsi khas untuk membersihkan string \n literal, koma ekstra, dan menukarnya kepada HTML
  cleanAndFormatHtml(text: string): string {
    if (!text) return '';

    return text
      // 1. Buang koma berlebihan di hujung/tengah teks (cth: ',,' atau ', ,')
      .replace(/,(\s*,)+/g, ',')
      .replace(/,\s*$/g, '')
      // 2. Tukar string literal '\n' atau '\\n' daripada CSV kepada tag <br>
      .replace(/\\n/g, '<br>')
      .replace(/\r\n|\r|\n/g, '<br>')
      // 3. Bersihkan pemisah <br> yang berulang secara berlebihan (lebih 2 berturut-turut)
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
    const nameSet = new Set<string>();

    const nameIdx = headers.findIndex(h => h === 'name' || h.includes('nama'));
    const topicIdx = headers.findIndex(h => h.includes('topic') || h.includes('topik'));
    const pageTypeIdx = headers.findIndex(h => h.includes('pagetype') || h.includes('type'));
    const data1Idx = headers.findIndex(h => h === 'data1' || h.includes('content') || h.includes('kandungan') || h.includes('data'));

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvRow(lines[i]);
      if (values.length === 0) continue;

      const rawName = (nameIdx !== -1 ? values[nameIdx] : values[0]) || `Slaid ${i}`;
      const rawTopic = (topicIdx !== -1 ? values[topicIdx] : values[1]) || 'Umum';
      const pageType = (pageTypeIdx !== -1 ? values[pageTypeIdx] : values[2]) || 'normal';
      const rawData1 = (data1Idx !== -1 ? values[data1Idx] : values[3]) || '';

      const cleanName = rawName.replace(/^["'\s]+|["'\s]+$/g, '').trim();
      const cleanTopic = rawTopic.replace(/^["'\s]+|["'\s]+$/g, '').trim();

      if (cleanName) nameSet.add(cleanName);

      // Bersihkan dan formatkan kandungan utama
      const formattedData1 = this.cleanAndFormatHtml(rawData1);

      let titleText = cleanName || cleanTopic;
      let contentText = formattedData1;
      let bulletPoints: SafeHtml[] | undefined;
      let isNumbered = false;

      // Jika kandungan mengandungi poin bernombor (seperti 1., 2., 3.)
      if (pageType.toLowerCase().includes('list') || /\d+\.\s/.test(contentText)) {
        isNumbered = pageType.toLowerCase().includes('sorted') || /\d+\.\s/.test(contentText);
        
        // Asingkan perenggan berdasarkan tag <br>
        const parts = contentText
          .split(/<br\s*\/?>/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        if (parts.length > 1) {
          contentText = parts[0]; // Baris tajuk/penerangan
          bulletPoints = parts.slice(1).map(p => {
            // Buang nombor awalan seperti '1. ', '2. ' jika menggunakan senarai <ol>/<ul>
            const cleanPoint = p.replace(/^\d+\.\s*/, '');
            return this.sanitizer.bypassSecurityTrustHtml(cleanPoint);
          });
        }
      }

      parsedSlides.push({
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
      this.slideNames = Array.from(nameSet);
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
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }
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

  onNameChange(): void {
    this.filterSlides();
  }

  filterSlides(): void {
    if (this.selectedName === 'ALL') {
      this.filteredSlides = [...this.allSlides];
    } else {
      this.filteredSlides = this.allSlides.filter(s => s.name === this.selectedName);
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

  toggleFullscreen(): void {
    const elem = this.sliderContainer.nativeElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err: any) => alert(`Ralat: ${err.message}`));
    } else {
      document.exitFullscreen();
    }
  }

  printToPdf(): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    let slidesHtml = '';
    this.filteredSlides.forEach((slide, idx) => {
      slidesHtml += `
        <div class="pdf-slide">
          <div class="top-tag">${slide.name} - ${slide.topic} (Slaid ${idx + 1})</div>
          <h2>${slide.title}</h2>
          <div class="content">${slide.content}</div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Eksport Slaid PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .pdf-slide { page-break-after: always; border: 1px solid #ccc; padding: 24px; border-radius: 8px; margin-bottom: 20px; }
            .top-tag { color: #2563eb; font-weight: bold; font-size: 12px; text-transform: uppercase; }
            h2 { color: #0f172a; margin-top: 5px; }
          </style>
        </head>
        <body>
          ${slidesHtml}
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}