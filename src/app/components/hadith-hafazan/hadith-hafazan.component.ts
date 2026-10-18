
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface HadithCollection {
  key: string;
  name: string;
  arabic_name: string;
  author: string;
  reliability: string;
  total_hadiths: number;
}

interface Hadith {
  number: string;
  arabic: string;
  english: string;
  malay: string;
  malayTranslated?: boolean;
  narrator: string;
  source: string;
}

interface CachedHadith {
  hadith: Hadith;
  cachedAt: number;
}

interface HadithBrowserData {
  selectedCollection: string;
  selectedNumber: number;
  memorized: string[];
  notes: Record<string, string>;
  updatedAt: string;
}

@Component({
  selector: 'app-hadith-hafazan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hadith-hafazan.component.html',
  styleUrl: './hadith-hafazan.component.css'
})
export class HadithHafazanComponent implements OnInit {
  private readonly apiUrl = 'https://www.ummahapi.com/api';

  // Untuk aplikasi produksi, lebih selamat panggil Ummah API melalui backend.
  private readonly apiKey =
    'umh_b1e6188b4913ed6ac1e37d4871911156bcdb426a';

  // Endpoint Google Translate biasa; bukan Google Cloud Translation API.
  private readonly googleTranslateUrl =
    'https://translate.googleapis.com/translate_a/single';

  private readonly browserDataKey = 'hadith-hafazan-data-v1';
  private readonly hadithCacheKey = 'hadith-cache-v1';
  private readonly cacheExpiryMs = 30 * 24 * 60 * 60 * 1000;

  private hadithCache: Record<string, CachedHadith> = {};
  private requestId = 0;

  collections: HadithCollection[] = [
    {
      key: 'bukhari',
      name: 'Sahih al-Bukhari',
      arabic_name: 'صَحِيحُ الْبُخَارِيِّ',
      author: 'Imam Bukhari',
      reliability: 'Sahih',
      total_hadiths: 7580
    },
    {
      key: 'muslim',
      name: 'Sahih Muslim',
      arabic_name: 'صَحِيحُ مُسْلِمٍ',
      author: 'Imam Muslim',
      reliability: 'Sahih',
      total_hadiths: 7360
    },
    {
      key: 'abudawud',
      name: 'Sunan Abu Dawud',
      arabic_name: 'سُنَنُ أَبِي دَاوُدَ',
      author: 'Abu Dawud',
      reliability: 'Hasan/Sahih',
      total_hadiths: 5272
    },
    {
      key: 'tirmidhi',
      name: 'Jami at-Tirmidhi',
      arabic_name: 'جَامِعُ التِّرْمِذِيِّ',
      author: 'Imam Tirmidhi',
      reliability: 'Hasan/Sahih',
      total_hadiths: 3926
    },
    {
      key: 'ibnmajah',
      name: 'Sunan Ibn Majah',
      arabic_name: 'سُنَنُ ابْنِ مَاجَهْ',
      author: 'Ibn Majah',
      reliability: 'Hasan/Sahih',
      total_hadiths: 4340
    },
    {
      key: 'nasai',
      name: "Sunan an-Nasa'i",
      arabic_name: 'سُنَنُ النَّسَائِيِّ',
      author: "Imam an-Nasa'i",
      reliability: 'Sahih',
      total_hadiths: 5679
    },
    {
      key: 'malik',
      name: 'Muwatta Malik',
      arabic_name: 'مُوَطَّأُ مَالِكٍ',
      author: 'Imam Malik',
      reliability: 'Sahih',
      total_hadiths: 1829
    },
    {
      key: 'nawawi',
      name: "Nawawi's 40 Hadith",
      arabic_name: 'الْأَرْبَعُونَ النَّوَوِيَّةُ',
      author: 'Imam an-Nawawi',
      reliability: 'Various',
      total_hadiths: 42
    },
    {
      key: 'qudsi',
      name: '40 Hadith Qudsi',
      arabic_name: 'الْأَحَادِيثُ الْقُدْسِيَّةُ',
      author: 'Various',
      reliability: 'Various',
      total_hadiths: 40
    },
    {
      key: 'dehlawi',
      name: "Shah Waliullah's 40 Hadith",
      arabic_name: 'الْأَرْبَعُونَ لِوَلِيِّ اللَّهِ الدَّهْلَوِيِّ',
      author: 'Shah Waliullah Dehlawi',
      reliability: 'Various',
      total_hadiths: 40
    }
  ];

  selectedCollection = 'nawawi';
  selectedNumber = 1;
  searchNumber = '1';

  currentHadith: Hadith | null = null;

  loading = false;
  translationLoading = false;
  translationError = '';
  error = '';
  cacheStatus = '';
  saveMessage = '';
  showMeaning = true;

  memorized = new Set<string>();
  notes: Record<string, string> = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadHadithCache();
    this.restoreBrowserData();
    this.loadHadith(this.selectedNumber);
  }

  get collection(): HadithCollection {
    return this.collections.find(
      item => item.key === this.selectedCollection
    ) ?? this.collections[0];
  }

  get totalHadiths(): number {
    return this.collection.total_hadiths;
  }

  get memorizedCount(): number {
    const prefix = `${this.selectedCollection}:`;

    return [...this.memorized].filter(key =>
      key.startsWith(prefix)
    ).length;
  }

  get progress(): number {
    return this.totalHadiths
      ? Math.min(
          100,
          Math.round(
            this.memorizedCount / this.totalHadiths * 100
          )
        )
      : 0;
  }

  get currentNoteKey(): string {
    return `${this.selectedCollection}:${this.selectedNumber}`;
  }

  get currentNote(): string {
    return this.notes[this.currentNoteKey] ?? '';
  }

  get isMemorized(): boolean {
    return this.memorized.has(this.currentNoteKey);
  }

  get visibleNumbers(): number[] {
    const total = this.totalHadiths;
    const start = Math.max(1, this.selectedNumber - 5);
    const end = Math.min(total, start + 10);

    return Array.from(
      { length: Math.max(0, end - start + 1) },
      (_, index) => start + index
    );
  }

  private makeKey(
    collection: string,
    number: number | string
  ): string {
    return `${collection}:${number}`;
  }

  // ==============================
  // BROWSER DATA
  // ==============================

  saveBrowserData(): void {
    const data: HadithBrowserData = {
      selectedCollection: this.selectedCollection,
      selectedNumber: this.selectedNumber,
      memorized: [...this.memorized],
      notes: this.notes,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(
        this.browserDataKey,
        JSON.stringify(data)
      );

      this.saveMessage = 'Data berjaya disimpan dalam browser.';
    } catch (error) {
      console.error('Gagal menyimpan data browser:', error);
      this.saveMessage = 'Gagal menyimpan data. Storan mungkin penuh.';
    }
  }

  restoreBrowserData(): void {
    try {
      const raw = localStorage.getItem(this.browserDataKey);

      if (!raw) {
        return;
      }

      const data = JSON.parse(raw) as HadithBrowserData;

      if (
        data.selectedCollection &&
        this.collections.some(
          item => item.key === data.selectedCollection
        )
      ) {
        this.selectedCollection = data.selectedCollection;
      }

      if (
        Number.isInteger(data.selectedNumber) &&
        data.selectedNumber >= 1 &&
        data.selectedNumber <= this.totalHadiths
      ) {
        this.selectedNumber = data.selectedNumber;
        this.searchNumber = String(data.selectedNumber);
      }

      if (Array.isArray(data.memorized)) {
        this.memorized = new Set(
          data.memorized.filter(
            (item): item is string => typeof item === 'string'
          )
        );
      }

      if (
        data.notes &&
        typeof data.notes === 'object' &&
        !Array.isArray(data.notes)
      ) {
        this.notes = data.notes;
      }
    } catch (error) {
      console.error('Gagal memulihkan data browser:', error);
      this.saveMessage = 'Data browser tidak dapat dibaca.';
    }
  }

  // ==============================
  // HADITH CACHE
  // ==============================

  private loadHadithCache(): void {
    try {
      const raw = localStorage.getItem(this.hadithCacheKey);

      if (raw) {
        this.hadithCache = JSON.parse(raw);
      }
    } catch (error) {
      console.error('Gagal membaca cache hadis:', error);
      this.hadithCache = {};
    }
  }

  private persistHadithCache(): void {
    try {
      localStorage.setItem(
        this.hadithCacheKey,
        JSON.stringify(this.hadithCache)
      );
    } catch (error) {
      console.error('Gagal menyimpan cache hadis:', error);
      this.cacheStatus = 'Storan cache penuh atau tidak tersedia.';
    }
  }

  private getCachedHadith(
    collection: string,
    number: number | string
  ): Hadith | null {
    const key = this.makeKey(collection, number);
    const cached = this.hadithCache[key];

    if (!cached) {
      return null;
    }

    if (
      !cached.cachedAt ||
      Date.now() - cached.cachedAt > this.cacheExpiryMs
    ) {
      delete this.hadithCache[key];
      this.persistHadithCache();
      return null;
    }

    return cached.hadith;
  }

  private saveHadithCache(
    collection: string,
    requestedNumber: number | string,
    hadith: Hadith
  ): void {
    const key = this.makeKey(collection, requestedNumber);

    this.hadithCache[key] = {
      hadith,
      cachedAt: Date.now()
    };

    this.persistHadithCache();
  }

  clearHadithCache(): void {
    try {
      localStorage.removeItem(this.hadithCacheKey);
      this.hadithCache = {};
      this.cacheStatus = 'Cache hadis telah dikosongkan.';
    } catch (error) {
      console.error('Gagal mengosongkan cache:', error);
      this.cacheStatus = 'Gagal mengosongkan cache.';
    }
  }

  // ==============================
  // LOAD HADITH
  // ==============================

  selectCollection(key: string): void {
    if (!this.collections.some(item => item.key === key)) {
      return;
    }

    this.selectedCollection = key;
    this.selectedNumber = 1;
    this.searchNumber = '1';
    this.currentHadith = null;

    this.saveBrowserData();
    this.loadHadith(1);
  }

  loadHadith(number: number | string): void {
    const requestedNumber = Number(number);

    if (
      !Number.isInteger(requestedNumber) ||
      requestedNumber < 1 ||
      requestedNumber > this.totalHadiths
    ) {
      this.error =
        `Masukkan nombor antara 1 hingga ${this.totalHadiths}.`;
      return;
    }

    const collectionKey = this.selectedCollection;
    const activeRequestId = ++this.requestId;

    this.selectedNumber = requestedNumber;
    this.searchNumber = String(requestedNumber);
    this.error = '';
    this.translationError = '';
    this.translationLoading = false;

    const cachedHadith = this.getCachedHadith(
      collectionKey,
      requestedNumber
    );

    if (cachedHadith) {
      this.currentHadith = cachedHadith;
      this.loading = false;
      this.cacheStatus = 'Dipaparkan daripada cache browser.';

      // Terjemahkan jika belum ada terjemahan dalam cache.
      if (
        !cachedHadith.malayTranslated ||
        !cachedHadith.malay.trim()
      ) {
        this.translateArabicToMalay(
          cachedHadith,
          collectionKey,
          requestedNumber,
          activeRequestId
        );
      }
    } else {
      this.currentHadith = null;
      this.loading = true;
      this.cacheStatus = 'Memuatkan hadis daripada Ummah API...';
    }

    this.saveBrowserData();

    const params = new HttpParams().set(
      'apikey',
      this.apiKey
    );

    const url =
      `${this.apiUrl}/hadith/` +
      `${encodeURIComponent(collectionKey)}/` +
      `${encodeURIComponent(String(requestedNumber))}`;

    this.http.get<any>(url, { params }).subscribe({
      next: response => {
        if (activeRequestId !== this.requestId) {
          return;
        }

        const item =
          response?.data?.hadith ??
          response?.data?.item ??
          response?.data?.hadiths?.[0] ??
          response?.data?.data ??
          response?.data ??
          response?.hadith ??
          response;

        if (response?.success === false || !item) {
          this.handleLoadFailure(
            'Hadis tidak ditemui.',
            activeRequestId,
            !!cachedHadith
          );
          return;
        }

        const hadith = this.mapHadith(
          item,
          requestedNumber,
          collectionKey
        );

        if (!hadith.arabic.trim()) {
          this.handleLoadFailure(
            'Teks Arab tidak ditemui. Semak format respons Ummah API.',
            activeRequestId,
            !!cachedHadith
          );
          return;
        }

        // Utamakan terjemahan yang telah disimpan dalam cache.
        const latestCached = this.getCachedHadith(
          collectionKey,
          requestedNumber
        );

        if (
          latestCached?.malayTranslated &&
          latestCached.malay.trim()
        ) {
          hadith.malay = latestCached.malay;
          hadith.malayTranslated = true;
        } else {
          // Jangan gunakan terjemahan Melayu daripada Ummah API.
          hadith.malay = '';
          hadith.malayTranslated = false;
        }

        this.currentHadith = hadith;

        this.saveHadithCache(
          collectionKey,
          requestedNumber,
          hadith
        );

        this.loading = false;
        this.cacheStatus = 'Cache hadis dikemas kini daripada API.';
        this.saveBrowserData();

        if (
          !hadith.malayTranslated ||
          !hadith.malay.trim()
        ) {
          this.translateArabicToMalay(
            hadith,
            collectionKey,
            requestedNumber,
            activeRequestId
          );
        }
      },

      error: err => {
        console.error('Ummah API error:', err);

        this.handleLoadFailure(
          'Gagal mendapatkan hadis daripada API.',
          activeRequestId,
          !!cachedHadith
        );
      }
    });
  }

  private mapHadith(
    item: any,
    requestedNumber: number,
    collectionKey: string
  ): Hadith {
    const text = (...values: unknown[]): string => {
      const value = values.find(
        candidate =>
          typeof candidate === 'string' &&
          candidate.trim().length > 0
      );

      return typeof value === 'string' ? value.trim() : '';
    };

    const collectionName =
      this.collections.find(
        collection => collection.key === collectionKey
      )?.name ?? collectionKey;

    return {
      number: String(
        item?.number ??
        item?.hadith_number ??
        item?.hadithNumber ??
        requestedNumber
      ),

      arabic: text(
        item?.arabic,
        item?.arabic_text,
        item?.arabicText,
        item?.text_arabic,
        item?.text_ar,
        item?.arab
      ),

      english: text(
        item?.english,
        item?.english_text,
        item?.englishText,
        item?.text_english,
        item?.text_en
      ),

      // Terjemahan Melayu akan dijana daripada teks Arab.
      malay: '',
      malayTranslated: false,

      narrator: text(
        item?.narrator,
        item?.narrator_name,
        item?.narratorName,
        item?.rawi
      ),

      source: text(
        item?.source,
        item?.book,
        item?.collection,
        collectionName
      )
    };
  }

  private handleLoadFailure(
    message: string,
    activeRequestId: number,
    hasCache: boolean
  ): void {
    if (activeRequestId !== this.requestId) {
      return;
    }

    this.loading = false;

    if (hasCache && this.currentHadith) {
      this.cacheStatus =
        'API tidak dapat dicapai. Memaparkan cache yang tersedia.';
      this.error = '';
    } else {
      this.error = message;
      this.cacheStatus = 'Tiada cache tersedia untuk hadis ini.';
    }
  }

  // ==============================
  // GOOGLE TRANSLATE: ARABIC -> MALAY
  // ==============================

  private translateArabicToMalay(
    hadith: Hadith,
    collectionKey: string,
    requestedNumber: number,
    activeRequestId: number
  ): void {
    if (!hadith.arabic.trim()) {
      this.translationError =
        'Teks Arab tidak tersedia untuk diterjemahkan.';
      return;
    }

    if (hadith.malayTranslated && hadith.malay.trim()) {
      return;
    }

    this.translationLoading = true;
    this.translationError = '';

    const params = new HttpParams()
      .set('client', 'gtx')
      .set('sl', 'ar')
      .set('tl', 'ms')
      .set('dt', 't')
      .set('q', hadith.arabic);

    this.http.get<any>(
      this.googleTranslateUrl,
      { params }
    ).subscribe({
      next: response => {
        const translatedText = Array.isArray(response?.[0])
          ? response[0]
              .map((part: any[]) => part?.[0] ?? '')
              .join('')
              .trim()
          : '';

        if (!translatedText) {
          if (activeRequestId === this.requestId) {
            this.translationLoading = false;
            this.translationError =
              'Google Translate tidak memulangkan terjemahan.';
          }
          return;
        }

        const translatedHadith: Hadith = {
          ...hadith,
          malay: translatedText,
          malayTranslated: true
        };

        // Simpan teks hadis dan terjemahan dalam cache browser.
        this.saveHadithCache(
          collectionKey,
          requestedNumber,
          translatedHadith
        );

        if (activeRequestId === this.requestId) {
          this.currentHadith = translatedHadith;
          this.translationLoading = false;
          this.translationError = '';
          this.cacheStatus =
            'Hadis dan terjemahan disimpan dalam cache browser.';
        }
      },

      error: err => {
        console.error('Google Translate error:', err);

        if (activeRequestId === this.requestId) {
          this.translationLoading = false;
          this.translationError =
            'Terjemahan gagal. Google mungkin menyekat permintaan browser atau berlaku ralat CORS.';
        }
      }
    });
  }

  retryTranslation(): void {
    if (!this.currentHadith) {
      return;
    }

    this.translateArabicToMalay(
      this.currentHadith,
      this.selectedCollection,
      this.selectedNumber,
      this.requestId
    );
  }

  // ==============================
  // NAVIGATION
  // ==============================

  goToNumber(): void {
    this.loadHadith(this.searchNumber);
  }

  previousHadith(): void {
    if (this.selectedNumber > 1) {
      this.loadHadith(this.selectedNumber - 1);
    }
  }

  nextHadith(): void {
    if (this.selectedNumber < this.totalHadiths) {
      this.loadHadith(this.selectedNumber + 1);
    }
  }

  // ==============================
  // HAFALAN
  // ==============================

  toggleMemorized(): void {
    const key = this.makeKey(
      this.selectedCollection,
      this.selectedNumber
    );

    if (this.memorized.has(key)) {
      this.memorized.delete(key);
    } else {
      this.memorized.add(key);
    }

    this.saveBrowserData();
  }

  isNumberMemorized(number: number): boolean {
    return this.memorized.has(
      this.makeKey(this.selectedCollection, number)
    );
  }

  // ==============================
  // NOTES
  // ==============================

  saveNote(value: string): void {
    this.notes[this.currentNoteKey] = value;
    this.saveBrowserData();
  }

  toggleMeaning(): void {
    this.showMeaning = !this.showMeaning;
  }

  // ==============================
  // EXPORT / IMPORT
  // ==============================

  exportBrowserData(): void {
    try {
      const data: HadithBrowserData = {
        selectedCollection: this.selectedCollection,
        selectedNumber: this.selectedNumber,
        memorized: [...this.memorized],
        notes: this.notes,
        updatedAt: new Date().toISOString()
      };

      const backup = {
        version: 1,
        browserData: data,
        hadithCache: this.hadithCache
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: 'application/json;charset=utf-8' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'hadith-hafazan-backup.json';
      link.click();

      URL.revokeObjectURL(url);
      this.saveMessage = 'Eksport backup selesai.';
    } catch (error) {
      console.error('Eksport gagal:', error);
      this.saveMessage = 'Gagal mengeksport backup.';
    }
  }

  importBrowserData(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data: HadithBrowserData =
          parsed.browserData ?? parsed;

        if (
          !data ||
          !Array.isArray(data.memorized) ||
          !data.notes ||
          typeof data.notes !== 'object'
        ) {
          throw new Error('Format backup tidak sah.');
        }

        if (
          data.selectedCollection &&
          !this.collections.some(
            item => item.key === data.selectedCollection
          )
        ) {
          throw new Error('Koleksi dalam backup tidak sah.');
        }

        if (
          parsed.hadithCache &&
          typeof parsed.hadithCache === 'object'
        ) {
          this.hadithCache = parsed.hadithCache;
          this.persistHadithCache();
        }

        localStorage.setItem(
          this.browserDataKey,
          JSON.stringify(data)
        );

        this.restoreBrowserData();

        this.currentHadith = null;
        this.loadHadith(this.selectedNumber);

        this.saveMessage = 'Backup berjaya dipulihkan.';
      } catch (error) {
        console.error('Import gagal:', error);
        this.saveMessage = 'Fail backup tidak sah atau rosak.';
      } finally {
        input.value = '';
      }
    };

    reader.onerror = () => {
      this.saveMessage = 'Gagal membaca fail backup.';
      input.value = '';
    };

    reader.readAsText(file);
  }
}
