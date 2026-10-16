import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';

export interface ArabicItem {
  w: string;
  English?: string;
  Malay: string;
  Rohingya?: string;
  Urdu?: string;
  Transliteration?: string;
  Category?: string;
  ExampleArabic?: string;
  ExampleMalay?: string;
  Difficulty: number | string;
  ImageURL?: string;
}

export interface Question {
  arabicWord: string;
  image?: string;
  options: string[];
  answer: string;
  level: number;
}

@Component({
  selector: 'app-arabic-quiz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arabic-quiz.component.html',
  styleUrls: ['./arabic-quiz.component.css']
})
export class ArabicQuizComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('threeCanvas') threeCanvas!: ElementRef<HTMLCanvasElement>;

  rawData: ArabicItem[] = [];
  allQuestions: Question[] = [];
  filteredQuestions: Question[] = [];

  // Status Permainan
  selectedLevel: number = 1;
  isPlaying: boolean = false;
  isGameOver: boolean = false;
  isLoading: boolean = true;

  currentIndex: number = 0;
  score: number = 0;

  // Time Attack Settings (Tiada had maksimum untuk timeLeft)
  timeLeft: number = 15;
  timer: any;
  private freeTimer: any; 

  // State untuk warna jawapan & animasi masa
  selectedOption: string | null = null;
  isAnswerChecked: boolean = false;
  isTimeAdded: boolean = false;

  // Three.js variables
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private particlesMesh!: THREE.Points;
  private animationFrameId: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadQuizData(false);
  }

  ngAfterViewInit(): void {
    this.initThreeJS();
  }

  // Listener untuk papan kekunci (Keyboard Shortcuts)
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isPlaying) return;

    const currentQ = this.filteredQuestions[this.currentIndex];
    if (!currentQ) return;

    // Jika belum jawab, tekan 1, 2, 3, 4 untuk pilih A, B, C, D
    if (!this.isAnswerChecked) {
      let optionIndex = -1;
      if (event.key === '1') optionIndex = 0;
      else if (event.key === '2') optionIndex = 1;
      else if (event.key === '3') optionIndex = 2;
      else if (event.key === '4') optionIndex = 3;

      if (optionIndex !== -1 && currentQ.options[optionIndex]) {
        this.selectAnswer(currentQ.options[optionIndex]);
      }
    } 
    // Jika sudah jawab (sedang masa jeda 10 saat), tekan Enter untuk skip jeda
    else {
      if (event.key === 'Enter') {
        this.proceedToNextQuestion();
      }
    }
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

  loadQuizData(forceRefresh: boolean = false): void {
    this.isLoading = true;
    const cacheKey = 'arabic_quiz_csv_cache';
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData && !forceRefresh) {
      this.processCsvData(cachedData);
    } else {
      this.http.get('https://quizapi.ezcigu.online/quizcsv', { responseType: 'text' }).subscribe({
        next: (csvText) => {
          localStorage.setItem(cacheKey, csvText);
          this.processCsvData(csvText);
        },
        error: (err) => {
          console.error('Ralat memuatkan data kuiz:', err);
          if (cachedData) {
            this.processCsvData(cachedData);
          } else {
            this.isLoading = false;
          }
        }
      });
    }
  }

  refreshQuizData(): void {
    this.loadQuizData(true);
  }

  private processCsvData(csvText: string): void {
    const items = this.parseCSV(csvText);
    this.rawData = items;
    this.allQuestions = this.transformDataToQuestions(items);
    this.isLoading = false;
  }

  private parseCSV(csvText: string): ArabicItem[] {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result: ArabicItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (currentLine.length >= headers.length) {
        const item: any = {};
        headers.forEach((header, index) => {
          let value = currentLine[index] ? currentLine[index].trim() : '';
          value = value.replace(/^"|"$/g, '');
          item[header] = value;
        });
        result.push(item);
      }
    }
    return result;
  }

  private transformDataToQuestions(items: ArabicItem[]): Question[] {
    const allMalayAnswers = items.map(i => i.Malay).filter(Boolean);

    return items.map(item => {
      const diffNum = Number(item.Difficulty) || 1;
      let calculatedLevel = Math.ceil(diffNum / 2);
      if (calculatedLevel < 1) calculatedLevel = 1;
      if (calculatedLevel > 10) calculatedLevel = 10;

      const wrongOptions = allMalayAnswers
        .filter(ans => ans !== item.Malay)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [item.Malay, ...wrongOptions].sort(() => 0.5 - Math.random());

      return {
        arabicWord: item.w,
        image: item.ImageURL || '',
        options: options,
        answer: item.Malay,
        level: calculatedLevel
      };
    });
  }

  startQuiz(level: number): void {
    this.selectedLevel = level;

    this.filteredQuestions = this.allQuestions
      .filter(q => q.level === level)
      .sort(() => 0.5 - Math.random());

    if (this.filteredQuestions.length === 0) {
      this.filteredQuestions = [...this.allQuestions].sort(() => 0.5 - Math.random());
    }

    this.isPlaying = true;
    this.isGameOver = false;
    this.currentIndex = 0;
    this.score = 0;
    this.isAnswerChecked = false;
    this.selectedOption = null;
    this.isTimeAdded = false;
    this.timeLeft = 15; // Permulaan 15 saat, tanpa had maksimum

    this.startTimer();
  }

  startTimer(): void {
    clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.endGame();
      }
    }, 1000);
  }

  selectAnswer(option: string): void {
    if (this.isAnswerChecked) return;

    this.isAnswerChecked = true;
    this.selectedOption = option;
    clearInterval(this.timer); // Jeda masa (Free 10 seconds)

    const currentQ = this.filteredQuestions[this.currentIndex];
    
    if (option === currentQ.answer) {
      this.score += 10 + (this.timeLeft * 2);
      this.timeLeft += 5; // Betul: Tambah 5 saat tanpa had maksimum (unlimited accumulation)
      
      this.isTimeAdded = true;
      setTimeout(() => {
        this.isTimeAdded = false;
      }, 1500);
    }

    // Tunggu 10 saat sebelum ke soalan seterusnya secara automatik
    this.freeTimer = setTimeout(() => {
      this.proceedToNextQuestion();
    }, 10000);
  }

  proceedToNextQuestion(): void {
    clearTimeout(this.freeTimer);
    this.isAnswerChecked = false;
    this.selectedOption = null;
    this.isTimeAdded = false;
    this.currentIndex++;

    if (this.currentIndex < this.filteredQuestions.length) {
      this.startTimer(); // Sambung semula baki masa terkumpul (tanpa reset ke 15 saat)
    } else {
      this.endGame();
    }
  }

  endGame(): void {
    clearInterval(this.timer);
    clearTimeout(this.freeTimer);
    this.isPlaying = false;
    this.isGameOver = true;
  }

  resetQuiz(): void {
    this.isPlaying = false;
    this.isGameOver = false;
    this.selectedLevel = 1;
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearTimeout(this.freeTimer);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}