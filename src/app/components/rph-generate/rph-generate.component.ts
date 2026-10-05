import { Component, OnInit, Input, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RphService, ScheduleTopicMapping } from '../../services/rph.service';

export interface RphGeneratedItem {
  hari: string;
  tarikh: string;
  minggu: string;
  tajuk: string;
  pelajaran_bidang: string;
  isi: string;
  objektif: string;
  kelas_tahun: string;
  aktiviti: string;
  masa: string;
  abm: string;
  nilai_murni: string;
  refleksi: string;
  catatan: string;
  tanda_tangan_guru?: string;
  ulasan_penyelia?: string;
}

@Component({
  selector: 'app-rph-generate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rph-generate.component.html',
  styleUrls: ['./rph-generate.component.css']
})
export class RphGenerateComponent implements OnInit {
  private rphService = inject(RphService);
  private destroyRef = inject(DestroyRef);

  @Input() topicData: ScheduleTopicMapping | null = null;

  selectedLanguage: 'ms' | 'en' | 'ar' | 'jawi' = 'jawi';
  
  isLoading: boolean = false;
  errorMessage: string = '';

  rphList: RphGeneratedItem[] = [];

  // ==========================================
  // KAMUS LABEL MENGIKUT BAHASA (DICTIONARY)
  // ==========================================
  labelsMap: Record<string, any> = {
    jawi: {
      headerTitle: 'رنچڠن فڠجرن هارين',
      hari: 'هاري :',
      tarikh: 'تاريخ :',
      minggu: 'ميڠݢو :',
      tajuk: 'تاجوق :',
      pelajaranBidang: 'فلاجرن / بيدڠ :',
      isi: 'ايسي :',
      objektif: 'اوبجيقتيف :',
      kelasTahun: 'كلس / تاهون :',
      aktiviti: 'اكتيفيتي :',
      masa: 'ماس :',
      abm: 'اءى بي عيم :',
      nilaiMurni: 'نيلاي مورني :',
      refleksi: 'ريفليقسي :',
      catatan: 'چاتتن :',
      tandaTanganGuru: 'تندا تاڠن ݢورو :',
      ulasanPenyelia: 'اولسن دان تندا تاڠن فڽليا دان چوڤ :',
      placeholderTtGuru: 'نام / تندا تاڠن',
      placeholderUlasan: 'اولسن فڽليا'
    },
    ar: {
      headerTitle: 'خطة التدريس اليومية',
      hari: 'اليوم :',
      tarikh: 'التاريخ :',
      minggu: 'الأسبوع :',
      tajuk: 'الموضوع :',
      pelajaranBidang: 'المادة / المجال :',
      isi: 'المحتوى :',
      objektif: 'الأهداف :',
      kelasTahun: 'الصف / السنة :',
      aktiviti: 'الأنشطة :',
      masa: 'الوقت :',
      abm: 'الوسائل التعليمية :',
      nilaiMurni: 'القيم النبيلة :',
      refleksi: 'التأمل :',
      catatan: 'ملاحظات :',
      tandaTanganGuru: 'توقيع المعلم :',
      ulasanPenyelia: 'ملاحظات وتوقيع المشرف والختم :',
      placeholderTtGuru: 'الاسم / التوقيع',
      placeholderUlasan: 'ملاحظات المشرف'
    },
    ms: {
      headerTitle: 'RANCANGAN PENGAJARAN HARIAN',
      hari: 'HARI :',
      tarikh: 'TARIKH :',
      minggu: 'MINGGU :',
      tajuk: 'TAJUK :',
      pelajaranBidang: 'PELAJARAN / BIDANG :',
      isi: 'ISI / STANDARD PEMBELAJARAN :',
      objektif: 'OBJEKTIF PEMBELAJARAN :',
      kelasTahun: 'KELAS / TAHUN :',
      aktiviti: 'AKTIVITI PDPC :',
      masa: 'MASA :',
      abm: 'BBM / ABM :',
      nilaiMurni: 'NILAI MURNI :',
      refleksi: 'REFLEKSI :',
      catatan: 'CATATAN :',
      tandaTanganGuru: 'TANDA TANGAN GURU :',
      ulasanPenyelia: 'ULASAN & TANDA TANGAN PENYELIA DAN COP :',
      placeholderTtGuru: 'Nama / Tanda Tangan',
      placeholderUlasan: 'Ulasan Penyelia'
    },
    en: {
      headerTitle: 'DAILY LESSON PLAN',
      hari: 'DAY :',
      tarikh: 'DATE :',
      minggu: 'WEEK :',
      tajuk: 'TOPIC :',
      pelajaranBidang: 'SUBJECT / FIELD :',
      isi: 'CONTENT / LEARNING STANDARD :',
      objektif: 'LEARNING OBJECTIVES :',
      kelasTahun: 'CLASS / YEAR :',
      aktiviti: 'PDPC ACTIVITIES :',
      masa: 'TIME :',
      abm: 'TEACHING AIDS (BBM) :',
      nilaiMurni: 'MORAL VALUES :',
      refleksi: 'REFLECTION :',
      catatan: 'REMARKS :',
      tandaTanganGuru: 'TEACHER\'S SIGNATURE :',
      ulasanPenyelia: 'SUPERVISOR\'S COMMENTS & SIGNATURE WITH STAMP :',
      placeholderTtGuru: 'Name / Signature',
      placeholderUlasan: 'Supervisor Comments'
    }
  };

  /**
   * Getter untuk memudahkan capaian label mengikut bahasa yang dipilih pada HTML (cth: lbl.tajuk)
   */
  get lbl() {
    return this.labelsMap[this.selectedLanguage] || this.labelsMap['ms'];
  }

  ngOnInit(): void {
    // 1. Semak data dari @Input() atau memori RphService
    const activeData = this.topicData || this.rphService.getTopicData();

    if (activeData && activeData.items && activeData.items.length > 0) {
      this.janaRph(activeData);
    } else {
      // 2. Jika tiada dalam memori, cuba tarik terus dari sumber CSV/Google Sheets melalui RphService
      this.muatDataDariService();
    }
  }

  /**
   * Menarik data CSV/Sheets terus daripada RphService jika tiada dalam memori
   */
  muatDataDariService(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rphService.getPublishedCsvData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (csvItems: any[]) => {
          this.isLoading = false;
          console.log('📄 Data CSV Diterima dari RphService:', csvItems);

          if (csvItems && csvItems.length > 0) {
            // Memetakan data CSV kepada struktur RphGeneratedItem
            this.rphList = csvItems.map(item => ({
              hari: item.hari || item.Hari || this.dapatkanHariDariTarikh(item.tarikh || item.Tarikh),
              tarikh: item.tarikh || item.Tarikh || '',
              minggu: item.minggu || item.Minggu || '',
              tajuk: item.tajuk || item.Tajuk || item.topic || '',
              pelajaran_bidang: item.pelajaran_bidang || item['Pelajaran/Bidang'] || item.subject || '',
              isi: item.isi || item.Isi || item.standard_pembelajaran || '',
              objektif: item.objektif || item.Objektif || item.objektif_pembelajaran || '',
              kelas_tahun: item.kelas_tahun || item['Kelas/Tahun'] || item.kelas || '',
              aktiviti: Array.isArray(item.aktiviti) ? item.aktiviti.join('\n') : (item.aktiviti || item.Aktiviti || ''),
              masa: item.masa || item.Masa || '',
              abm: item.abm || item.ABM || item.bbm || '',
              nilai_murni: item.nilai_murni || item['Nilai Murni'] || '',
              refleksi: item.refleksi || item.Refleksi || '',
              catatan: item.catatan || item.Catatan || '',
              tanda_tangan_guru: item.tanda_tangan_guru || '',
              ulasan_penyelia: item.ulasan_penyelia || ''
            }));
          } else {
            this.errorMessage = 'Tiada data dijumpai daripada RphService. Sila simpan topik di Langkah 2 dahulu.';
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error('❌ Ralat menarik data dari RphService:', err);
          this.errorMessage = 'Gagal menarik data daripada RphService.';
        }
      });
  }

  /**
   * Menjana RPH menggunakan AI Gemini berdasarkan topik yang disediakan
   */
  janaRph(customData?: ScheduleTopicMapping): void {
    const payloadData = customData || this.topicData || this.rphService.getTopicData();

    if (!payloadData || !payloadData.items || payloadData.items.length === 0) {
      this.errorMessage = 'Tiada data topik disediakan untuk menjana RPH.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      ...payloadData,
      language: this.selectedLanguage
    };

    console.log('🚀 Menghantar Payload ke Gemini AI:', payload);

    this.rphService.generateRphFromGemini(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          console.log('🤖 [GEMINI RAW RESPONSE]:', res);

          // 1. Semak ralat dari API
          if (res && res.status === 'error') {
            console.error('❌ Ralat dari API Gemini:', res.message);
            this.errorMessage = res.message || 'Gagal menerima maklum balas dari Gemini.';
            this.rphList = [];
            return;
          }

          // 2. Ambil tatasusunan data daripada res.data
          let rawItems = res?.data || res?.rph || res;

          // Jika data dalam bentuk JSON string
          if (typeof rawItems === 'string') {
            try {
              const cleanedText = rawItems.replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanedText);
              rawItems = parsed.data || parsed.rph || parsed;
            } catch (e) {
              console.warn('⚠️ Gagal parse JSON string:', e);
            }
          }

          if (Array.isArray(rawItems) && rawItems.length > 0) {
            // 3. Pemetaan mengikut kunci sebenar daripada API Gemini
            this.rphList = rawItems.map((item: any) => {
              // Gabungkan aktiviti array menjadi string jika aktiviti_pdpc berbentuk array
              let aktivitiText = '';
              if (Array.isArray(item.aktiviti_pdpc)) {
                aktivitiText = item.aktiviti_pdpc.join('\n');
              } else if (Array.isArray(item.aktiviti)) {
                aktivitiText = item.aktiviti.join('\n');
              } else {
                aktivitiText = item.aktiviti_pdpc || item.aktiviti || '';
              }

              // Gabungkan Masa Mula & Masa Tamat
              let masaText = item.masa || item.Masa || '';
              if (item.masa_mula && item.masa_tamat) {
                masaText = `${item.masa_mula} - ${item.masa_tamat}`;
              }

              // Dapatkan Hari daripada Tarikh secara automatik
              const tarikhStr = item.tarikh || item.Tarikh || '';
              let hariText = item.hari || item.Hari || this.dapatkanHariDariTarikh(tarikhStr);

              // Gabungkan Pelajaran / Bidang / Subject / Subtopic
              const pelajaranBidangText = item.pelajaran_bidang || item['Pelajaran/Bidang'] || 
                (item.subject && item.subtopic ? `${item.subject} (${item.subtopic})` : item.subject || item.subtopic || '');

              return {
                hari: hariText,
                tarikh: tarikhStr,
                minggu: item.minggu || item.Minggu || '',
                tajuk: item.topic || item.tajuk || item.Tajuk || '',
                pelajaran_bidang: pelajaranBidangText,
                isi: item.standard_pembelajaran || item.isi || item.Isi || item.kriteria_kejayaan || '',
                objektif: item.objektif_pembelajaran || item.objektif || item.Objektif || '',
                kelas_tahun: item.kelas || item.kelas_tahun || item['Kelas/Tahun'] || '',
                aktiviti: aktivitiText,
                masa: masaText,
                abm: item.bbm || item.abm || item.ABM || '',
                nilai_murni: item.nilai_murni || item['Nilai Murni'] || '',
                refleksi: item.refleksi || item.Refleksi || '',
                catatan: item.catatan || item.Catatan || '',
                tanda_tangan_guru: item.tanda_tangan_guru || '',
                ulasan_penyelia: item.ulasan_penyelia || ''
              };
            });

            console.log('✅ [DATA RPH DIPETAKAN KE PRINT AREA]:', this.rphList);
          } else {
            this.errorMessage = 'Data RPH yang diterima tidak mengandungi senarai item yang sah.';
            this.rphList = [];
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error('❌ Ralat HTTP semasa memanggil Gemini AI:', err);
          this.errorMessage = 'Berlaku ralat rangkaian semasa menghubungi perkhidmatan Gemini.';
          this.rphList = [];
        }
      });
  }

  /**
   * Fungsi bantuan untuk mendapatkan nama hari Bahasa Melayu dari string tarikh (YYYY-MM-DD)
   */
  private dapatkanHariDariTarikh(tarikhStr: string): string {
    if (!tarikhStr) return '';
    try {
      const parts = tarikhStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(Date.UTC(year, month, day));
        const daysInMs = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
        return daysInMs[dateObj.getUTCDay()] || '';
      }
      const dateObj = new Date(tarikhStr);
      const daysInMs = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
      return daysInMs[dateObj.getDay()] || '';
    } catch {
      return '';
    }
  }

  /**
   * Menukar bahasa pilihan dan menjana semula isi RPH dari Gemini mengikut bahasa baharu
   */
  tukarBahasa(lang: 'ms' | 'en' | 'ar' | 'jawi'): void {
    this.selectedLanguage = lang;
    const activeData = this.topicData || this.rphService.getTopicData();
    if (activeData) {
      this.janaRph(activeData);
    }
  }

  exportToPdf(): void {
    window.print();
  }

  exportToWord(): void {
    const element = document.getElementById('rph-print-area');
    if (!element) return;

    const isRtl = this.selectedLanguage === 'ar' || this.selectedLanguage === 'jawi';
    const htmlHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Rancangan Pengajaran Harian</title>
        <style>
          body { font-family: 'Traditional Arabic', 'Amiri', 'Calibri', sans-serif; direction: ${isRtl ? 'rtl' : 'ltr'}; }
          .header-title { font-size: 20pt; font-weight: bold; text-align: center; margin-bottom: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
          td, th { border: 1px solid #000000; padding: 8px 12px; vertical-align: top; font-size: 12pt; }
          .rph-paper-page { page-break-after: always; }
        </style>
      </head>
      <body>
    `;
    const htmlFooter = '</body></html>';
    const sourceHTML = htmlHeader + element.innerHTML + htmlFooter;

    const blob = new Blob(['\ufeff' + sourceHTML], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RPH_${this.selectedLanguage.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}