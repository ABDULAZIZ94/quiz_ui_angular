import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface ScheduleItem {
  tarikh: string;
  kelas: string;
  subject: string;
  masa_mula: string;
  masa_tamat: string;
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

@Injectable({
  providedIn: 'root'
})
export class RphService {
  private webAppUrl = 'https://script.google.com/macros/s/AKfycbyxmInszG_6orlVTsNUF4hOI2e7vgwy_D-HGq6pDKx6MQOso5U14BV9mHcjf5FatQktkg/exec';
  private csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=920483592&single=true&output=csv';

  private http = inject(HttpClient);

  /**
   * Menyimpan jadual ke Google Apps Script
   */
  simpanSchedule(data: RphScheduleData): Observable<any> {
    return this.http.post(this.webAppUrl, JSON.stringify(data), {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  /**
   * Mengambil data CSV daripada pautan terbitan Google Sheets
   * dan menukarkannya kepada Array of Objects
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

    const lines = csvText.split(/\r\n|\n/);
    if (lines.length < 2) return [];

    // Mengambil baris pertama sebagai nama tajuk/lajur (headers)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));

    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Regex untuk mengendalikan nilai koma di dalam tanda petik
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(',');

      const rowObject: any = {};
      headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim() : '';
        // Buang tanda petik berganda jika ada
        val = val.replace(/^"(.*)"$/, '$1');
        rowObject[header] = val;
      });

      result.push(rowObject);
    }

    return result;
  }
}