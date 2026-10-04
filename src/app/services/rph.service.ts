import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private http = inject(HttpClient);

  simpanSchedule(data: RphScheduleData): Observable<any> {
    return this.http.post(this.webAppUrl, JSON.stringify(data), {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}