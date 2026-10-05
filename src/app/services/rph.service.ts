import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';

export interface ScheduleItem {
  tarikh: string;
  kelas: string;
  subject: string;
  masa_mula: string;
  masa_tamat: string;
  topic?: string;
  subtopic?: string;
  standard_pembelajaran?: string;
}

export interface ScheduleJson {
  nama_jadual: string;
  jadual: ScheduleItem[];
}

export interface RphScheduleData {
  id?: string;
  user_id: number;
  schedule: ScheduleJson;
  start_date: string;
  end_date: string;
}

// Interface khas untuk penetapan topik
export interface ScheduleTopicMapping {
  schedule_id?: string;
  user_id: number;
  nama_jadual: string;
  items: {
    slot_index: number;
    tarikh: string;
    kelas: string;
    subject: string;
    masa_mula: string;
    masa_tamat: string;
    topic: string;
    subtopic: string;
    standard_pembelajaran: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class RphService {
  private webAppUrl = 'https://script.google.com/macros/s/AKfycbyxmInszG_6orlVTsNUF4hOI2e7vgwy_D-HGq6pDKx6MQOso5U14BV9mHcjf5FatQktkg/exec';
  private csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=920483592&single=true&output=csv';
  private geminiApiUrl = 'https://script.google.com/macros/s/AKfycbxu6jeqmwRyG3RCST1X8O-_kxAwB3Zh30xW0NYzwjLvMctg5qcY4MB-MDLatgzUmM7rKw/exec';
  
  private http = inject(HttpClient);

  // === PEMBOLEHUBAH SIMPANAN TEMPATAN (IN-MEMORY STATE) ===
  private activeTopicData: ScheduleTopicMapping | null = null;

  /**
   * Menyimpan data topik terkini ke dalam memori Service
   */
  setTopicData(data: ScheduleTopicMapping): void {
    this.activeTopicData = data;
  }

  /**
   * Mengambil data topik yang tersimpan dari memori Service
   */
  getTopicData(): ScheduleTopicMapping | null {
    return this.activeTopicData;
  }

  /**
   * Menyimpan jadual ke Google Apps Script
   */
  simpanSchedule(data: RphScheduleData): Observable<any> {
    return this.http.post(this.webAppUrl, JSON.stringify(data), {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

/**
   * Menyimpan tetapan topik jadual RPH HANYA ke memori lokal & log ke console
   */
  simpanTopics(data: ScheduleTopicMapping): Observable<any> {
    // 1. Simpan data terus ke memori lokal
    this.setTopicData(data);

    // 2. Cetak log ke console
    console.log('Saved Topic (Memori Lokal):', data);

    // 3. Kembalikan Observable berjaya
    return of({ success: true, message: 'Topik berjaya disimpan ke memori lokal.' });
  }

/**
   * Menghantar ScheduleTopicMapping ke Apps Script untuk dijana oleh Gemini AI
   */
  generateRphFromGemini(data: ScheduleTopicMapping): Observable<any> {
    const payload = {
      action: 'generate_rph',
      ...data
    };

    return this.http.post(this.geminiApiUrl, JSON.stringify(payload), {
      headers: { 'Content-Type': 'text/plain' }
    }).pipe(
      tap((response: any) => {
        // Log jawapan penuh daripada Gemini AI ke console
        console.log('🤖 [Gemini AI Reply]:', response);
      })
    );
  }

  /**
   * Mengambil data CSV daripada pautan terbitan Google Sheets
   */
  getPublishedCsvData(): Observable<any[]> {
    return this.http.get(this.csvUrl, { responseType: 'text' }).pipe(
      map((csvText: string) => this.parseCsvToObjects(csvText))
    );
  }

  /**
   * Helper function untuk memproses/parse baris CSV kepada Objek JSON
   */
  private parseCsvToObjects(csvText: string): any[] {
    if (!csvText) return [];

    const rows = this.parseCsvRows(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());
    const result: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

      const rowObject: any = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index] !== undefined ? row[index] : '';
      });

      result.push(rowObject);
    }

    return result;
  }

  /**
   * CSV Parser State Machine
   */
  private parseCsvRows(text: string): string[][] {
    const p: string[][] = [[]];
    let curCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const nextC = text[i + 1];

      if (c === '"') {
        if (inQuotes && nextC === '"') {
          curCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        p[p.length - 1].push(curCell);
        curCell = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && nextC === '\n') {
          i++;
        }
        p[p.length - 1].push(curCell);
        curCell = '';
        p.push([]);
      } else {
        curCell += c;
      }
    }

    if (curCell !== '' || p[p.length - 1].length > 0) {
      p[p.length - 1].push(curCell);
    }

    return p;
  }
}