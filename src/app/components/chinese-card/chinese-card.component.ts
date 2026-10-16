import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface CardItem {
  hanzi: string;
  pinyin: string;
  meaning: string;
  isFlipped?: boolean;
}

@Component({
  selector: 'app-chinese-card',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './chinese-card.component.html',
  styleUrls: ['./chinese-card.component.css']
})
export class ChineseCardComponent implements OnInit {
  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=847252225&single=true&output=csv';

  cardList: CardItem[] = [];
  filteredCardList: CardItem[] = [];
  searchTerm = '';
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCardData();
  }

  loadCardData(): void {
    this.loading = true;
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.cardList = this.parseCSV(data);
        this.filteredCardList = [...this.cardList];
        this.loading = false;
      },
      error: (err) => {
        console.error('Ralat memuatkan data CSV:', err);
        this.loading = false;
      }
    });
  }

  parseCSV(csvText: string): CardItem[] {
    const lines = csvText.split('\n');
    const result: CardItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      if (row.length >= 3 && row[0] && row[1] && row[2]) {
        result.push({
          hanzi: row[0].trim(),
          pinyin: row[1].trim(),
          meaning: row[2].trim(),
          isFlipped: false
        });
      }
    }
    return result;
  }

  parseCSVRow(row: string): string[] {
    const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return row.split(re).map(val => val.replace(/^"|"$/g, '').trim());
  }

  filterCards(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredCardList = [...this.cardList];
    } else {
      this.filteredCardList = this.cardList.filter(card => 
        card.hanzi.toLowerCase().includes(term) ||
        card.pinyin.toLowerCase().includes(term) ||
        card.meaning.toLowerCase().includes(term)
      );
    }
  }

  flipCard(card: CardItem): void {
    card.isFlipped = !card.isFlipped;
  }
}