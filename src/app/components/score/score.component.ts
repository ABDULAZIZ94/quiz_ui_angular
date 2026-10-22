import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

interface ScoreRecord {
  timestamp: string;
  score: number;
  name: string;
  subject: string;
  parsedDate: Date;
}

@Component({
  selector: 'app-score-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './score.component.html',
  styleUrls: ['./score.component.css']
})
export class ScoreComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('threeCanvas') threeCanvas!: ElementRef<HTMLCanvasElement>;

  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=385767678&single=true&output=csv';
  
  allData: ScoreRecord[] = [];
  filteredData: ScoreRecord[] = [];
  availableSubjects: string[] = [];
  
  searchTerm: string = '';
  selectedSubject: string = '';
  sortDescendingScore: boolean = true; // Default: Skor tertinggi ke terendah
  isLoading: boolean = true;

  // Three.js variables
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private particlesMesh!: THREE.Points;
  private animationFrameId: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData(false);
  }

  ngAfterViewInit(): void {
    this.initThreeJS();
  }

  initThreeJS(): void {
    const canvas = this.threeCanvas.nativeElement;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 30;

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 60;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.7,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.7
    });

    this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(this.particlesMesh);

    this.animateThreeJS();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  animateThreeJS = () => {
    this.animationFrameId = requestAnimationFrame(this.animateThreeJS);
    if (this.particlesMesh) {
      this.particlesMesh.rotation.x += 0.001;
      this.particlesMesh.rotation.y += 0.0015;
    }
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize(): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loadData(forceRefresh: boolean = false): void {
    this.isLoading = true;
    const cacheKey = 'scoreboard_csv_cache';
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData && !forceRefresh) {
      this.processCSV(cachedData);
    } else {
      this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
        next: (data) => {
          localStorage.setItem(cacheKey, data);
          this.processCSV(data);
        },
        error: (err) => {
          console.error('Ralat semasa mengambil data CSV:', err);
          if (cachedData) {
            this.processCSV(cachedData);
          } else {
            this.isLoading = false;
          }
        }
      });
    }
  }

  refreshData(): void {
    this.loadData(true);
  }

  processCSV(csvText: string): void {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      this.isLoading = false;
      return;
    }

    const headers = this.parseCsvLine(lines[0]);
    
    const timestampIdx = headers.findIndex(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('tarikh'));
    const scoreIdx = headers.findIndex(h => h.toLowerCase().includes('score') || h.toLowerCase().includes('skor'));
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('nama'));
    const subjectIdx = headers.findIndex(h => h.toLowerCase().includes('subject') || h.toLowerCase().includes('subjek') || h.toLowerCase().includes('quiz'));

    const rawRecords: ScoreRecord[] = lines.slice(1).map(line => {
      const values = this.parseCsvLine(line);
      const timestampRaw = values[timestampIdx >= 0 ? timestampIdx : 0] || '';
      const scoreVal = Number(values[scoreIdx >= 0 ? scoreIdx : 1]) || 0;
      
      // Buang special characters, trim, dan hadkan kepada maksimum 20 huruf
      const rawName = values[nameIdx >= 0 ? nameIdx : 2] || 'Tanpa Nama';
      const cleanedName = rawName
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()
        .substring(0, 20);

      return {
        timestamp: timestampRaw,
        score: scoreVal,
        name: cleanedName || 'Tanpa Nama',
        subject: values[subjectIdx >= 0 ? subjectIdx : 3] || 'Umum',
        parsedDate: this.parseTimestamp(timestampRaw)
      };
    });

    // Buang duplikasi & ambil skor tertinggi bagi setiap pemain (mengikut nama & subjek)
    const map = new Map<string, ScoreRecord>();
    rawRecords.forEach(record => {
      const key = `${record.name.toLowerCase()}_${record.subject.trim().toLowerCase()}`;
      
      if (!map.has(key)) {
        map.set(key, record);
      } else {
        const existing = map.get(key)!;
        if (record.score > existing.score) {
          map.set(key, record);
        } else if (record.score === existing.score && record.parsedDate.getTime() > existing.parsedDate.getTime()) {
          map.set(key, record);
        }
      }
    });

    this.allData = Array.from(map.values());

    const subjects = this.allData.map(item => item.subject);
    this.availableSubjects = [...new Set(subjects)].sort();

    this.applyFilterAndSort();
    this.isLoading = false;
  }

  parseTimestamp(timestampStr: string): Date {
    if (!timestampStr) return new Date(0);
    
    let d = new Date(timestampStr);
    if (!isNaN(d.getTime())) return d;

    const parts = timestampStr.split(' ');
    if (parts.length > 0) {
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const isoStr = `${dateParts[1]}-${dateParts[2]}-${dateParts[0]} ${parts[1] || '00:00:00'}`;
        d = new Date(isoStr);
        if (!isNaN(d.getTime())) return d;
      }
    }
    
    return new Date(0);
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
    this.sortDescendingScore = !this.sortDescendingScore;
    this.applyFilterAndSort();
  }

  applyFilterAndSort(): void {
    let result = [...this.allData];

    if (this.selectedSubject !== '') {
      result = result.filter(item => item.subject === this.selectedSubject);
    }

    if (this.searchTerm.trim() !== '') {
      const lowerSearch = this.searchTerm.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(lowerSearch));
    }

    result.sort((a, b) => {
      if (a.score !== b.score) {
        return this.sortDescendingScore ? b.score - a.score : a.score - b.score;
      }
      return b.parsedDate.getTime() - a.parsedDate.getTime();
    });

    this.filteredData = result;
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}