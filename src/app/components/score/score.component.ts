import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ScoreRecord {
  timestamp: string;
  score: string;
  name: string;
  subject: string; // Lajur baharu untuk subjek
  parsedDate: Date;
}

@Component({
  selector: 'app-score-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './score.component.html',
  styleUrls: ['./score.component.css']
})
export class ScoreComponent implements OnInit {
  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=385767678&single=true&output=csv';
  
  allData: ScoreRecord[] = [];
  filteredData: ScoreRecord[] = [];
  availableSubjects: string[] = []; // Untuk dropdown filter subjek
  
  searchTerm: string = '';
  selectedSubject: string = ''; // Pembolehubah untuk filter subjek
  sortAscending: boolean = true;
  isLoading: boolean = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading = true;
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.processCSV(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ralat semasa mengambil data CSV:', err);
        this.isLoading = false;
      }
    });
  }

  processCSV(csvText: string): void {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return;

    const headers = this.parseCsvLine(lines[0]);
    
    // Kenal pasti indeks lajur
    const timestampIdx = headers.findIndex(h => h.toLowerCase().includes('timestamp') || h.toLowerCase().includes('tarikh'));
    const scoreIdx = headers.findIndex(h => h.toLowerCase().includes('score') || h.toLowerCase().includes('skor'));
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('nama'));
    // Mengesan lajur untuk subjek atau "quiz"
    const subjectIdx = headers.findIndex(h => h.toLowerCase().includes('subject') || h.toLowerCase().includes('subjek') || h.toLowerCase().includes('quiz'));

    this.allData = lines.slice(1).map(line => {
      const values = this.parseCsvLine(line);
      const timestampRaw = values[timestampIdx >= 0 ? timestampIdx : 0] || '';
      
      return {
        timestamp: timestampRaw,
        score: values[scoreIdx >= 0 ? scoreIdx : 1] || '-',
        name: values[nameIdx >= 0 ? nameIdx : 2] || 'Tanpa Nama',
        subject: values[subjectIdx >= 0 ? subjectIdx : 3] || 'Umum',
        parsedDate: new Date(timestampRaw) 
      };
    });

    // Ekstrak nama subjek yang unik untuk dropdown
    const subjects = this.allData.map(item => item.subject);
    this.availableSubjects = [...new Set(subjects)].sort();

    this.applyFilterAndSort();
  }

  parseCsvLine(text: string): string[] {
    let p = '', row = [''], i = 0, s = true, l;
    for (l of text) {
      if ('"' === l) {
        if (s && l === p) row[i] += l;
        s = !s;
      } else if (',' === l && s) l = row[++i] = '';
      else row[i] += l;
      p = l;
    }
    return row.map(v => v.trim());
  }

  onFilterChange(): void {
    this.applyFilterAndSort();
  }

  toggleSort(): void {
    this.sortAscending = !this.sortAscending;
    this.applyFilterAndSort();
  }

  applyFilterAndSort(): void {
    let result = this.allData;

    // 1. Fungsi tapisan Subjek
    if (this.selectedSubject !== '') {
      result = result.filter(item => item.subject === this.selectedSubject);
    }

    // 2. Fungsi carian Nama
    if (this.searchTerm.trim() !== '') {
      const lowerSearch = this.searchTerm.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(lowerSearch));
    }

    // 3. Fungsi susunan Tarikh & Masa
    result.sort((a, b) => {
      const timeA = a.parsedDate.getTime();
      const timeB = b.parsedDate.getTime();
      
      if (isNaN(timeA) || isNaN(timeB)) return 0;
      return this.sortAscending ? timeA - timeB : timeB - timeA;
    });

    this.filteredData = result;
  }
}