import { Component, OnInit, Input, Output, EventEmitter, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RphService, ScheduleItem, ScheduleJson, ScheduleTopicMapping } from '../../services/rph.service';

export interface PublishedScheduleOption {
  id: string;
  user_id: string;
  nama_jadual: string;
  start_date: string;
  end_date: string;
  scheduleRaw: ScheduleJson;
}

export interface TopicItemSlot extends ScheduleItem {
  slot_index: number;
  topic: string;
  subtopic: string;
  standard_pembelajaran: string;
}

@Component({
  selector: 'app-rph-topics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rph-topics.component.html',
  styleUrls: ['./rph-topics.component.css']
})
export class RphTopicComponent implements OnInit {
  private rphService = inject(RphService);
  private destroyRef = inject(DestroyRef);

  @Input() selectedSchedule: ScheduleJson | null = null;
  @Input() userId: number = 101;
  @Output() topicsSaved = new EventEmitter<ScheduleTopicMapping>();

  // Senarai Jadual CSV untuk pilihan jika tiada input dari Flow
  publishedSchedules: PublishedScheduleOption[] = [];
  filteredPublishedSchedules: PublishedScheduleOption[] = [];
  searchQuery: string = '';
  selectedScheduleId: string = '';
  isDropdownOpen: boolean = false;
  isLoadingCsv: boolean = false;

  namaJadual: string = '';
  slotsWithTopics: TopicItemSlot[] = [];

  // Kawalan Carian & Penapis Slot
  selectedSubjectFilter: string = 'ALL';
  availableSubjects: string[] = [];

  isSubmitting: boolean = false;
  message: string = '';

  // Mengisi topik secara pukal untuk subjek yang sama
  isBulkModalOpen: boolean = false;
  bulkSubject: string = '';
  bulkTopic: string = '';
  bulkSubtopic: string = '';
  bulkSKSP: string = '';

  ngOnInit(): void {
    if (this.selectedSchedule && this.selectedSchedule.jadual && this.selectedSchedule.jadual.length > 0) {
      this.loadFromScheduleJson(this.selectedSchedule);
    } else {
      this.loadPublishedSchedules();
    }
  }

  // Muat CSV untuk pilih jadual jika belum dipasang dari parent component
  loadPublishedSchedules(): void {
    this.isLoadingCsv = true;
    this.rphService.getPublishedCsvData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows: any[]) => {
          this.isLoadingCsv = false;
          this.processPublishedCsv(rows || []);
        },
        error: (err) => {
          this.isLoadingCsv = false;
          console.error('Ralat membaca data CSV:', err);
        }
      });
  }

  private processPublishedCsv(rows: any[]): void {
    this.publishedSchedules = rows.map((row, index) => {
      let parsedSchedule: ScheduleJson = { nama_jadual: '', jadual: [] };

      if (row.schedule) {
        try {
          parsedSchedule = typeof row.schedule === 'string'
            ? JSON.parse(row.schedule)
            : row.schedule;
        } catch (e) {
          console.warn('Gagal parse JSON jadual:', index, e);
        }
      }

      return {
        id: row.id ? String(row.id) : `REC_${index + 1}`,
        user_id: row.user_id ? String(row.user_id) : '',
        nama_jadual: row.nama_jadual || parsedSchedule.nama_jadual || `Jadual ${index + 1}`,
        start_date: row.start_date || '',
        end_date: row.end_date || '',
        scheduleRaw: parsedSchedule
      };
    });

    this.onSearchChange();

    // AUTO LOAD JADUAL DARI SERVICE
    if (this.publishedSchedules.length > 0) {
      const matchedSchedule = this.publishedSchedules.find(s => String(s.user_id) === String(this.userId)) 
                              || this.publishedSchedules[0];

      if (matchedSchedule) {
        this.pilihRekodJadual(matchedSchedule);
      }
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onSearchChange(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredPublishedSchedules = [...this.publishedSchedules];
      return;
    }

    this.filteredPublishedSchedules = this.publishedSchedules.filter(item =>
      item.id.toLowerCase().includes(q) ||
      item.nama_jadual.toLowerCase().includes(q) ||
      item.user_id.toLowerCase().includes(q)
    );
  }

  pilihRekodJadual(option: PublishedScheduleOption): void {
    this.selectedScheduleId = option.id;
    this.searchQuery = option.nama_jadual;
    this.isDropdownOpen = false;

    if (option.scheduleRaw) {
      this.loadFromScheduleJson(option.scheduleRaw);
    }
  }

  loadFromScheduleJson(scheduleJson: ScheduleJson): void {
    this.namaJadual = scheduleJson.nama_jadual || 'Jadual RPH';
    const list = scheduleJson.jadual || [];

    this.slotsWithTopics = list.map((item, index) => ({
      ...item,
      slot_index: index + 1,
      topic: item.topic || '',
      subtopic: item.subtopic || '',
      standard_pembelajaran: item.standard_pembelajaran || ''
    }));

    // Ekstrak senarai subjek unik untuk penapis
    const subjects = new Set<string>();
    this.slotsWithTopics.forEach(s => {
      if (s.subject) subjects.add(s.subject.trim());
    });
    this.availableSubjects = Array.from(subjects);
  }

  get filteredSlots(): TopicItemSlot[] {
    if (this.selectedSubjectFilter === 'ALL') {
      return this.slotsWithTopics;
    }
    return this.slotsWithTopics.filter(s => s.subject === this.selectedSubjectFilter);
  }

  openBulkApply(subject: string): void {
    this.bulkSubject = subject;
    this.bulkTopic = '';
    this.bulkSubtopic = '';
    this.bulkSKSP = '';
    this.isBulkModalOpen = true;
  }

  closeBulkModal(): void {
    this.isBulkModalOpen = false;
  }

  applyBulkTopic(): void {
    if (!this.bulkTopic) {
      alert('Sila masukkan topik.');
      return;
    }

    this.slotsWithTopics.forEach(slot => {
      if (slot.subject === this.bulkSubject) {
        slot.topic = this.bulkTopic;
        if (this.bulkSubtopic) slot.subtopic = this.bulkSubtopic;
        if (this.bulkSKSP) slot.standard_pembelajaran = this.bulkSKSP;
      }
    });

    this.closeBulkModal();
    alert(`Topik berjaya diterapkan untuk semua slot ${this.bulkSubject}!`);
  }

  // --- SIMPAN SEMUA TOPIK KE SERVICE ---
  simpanSemuaTopic(): void {
    // 1. Semak jika ada slot
    if (!this.slotsWithTopics || this.slotsWithTopics.length === 0) {
      alert('Tiada slot jadual untuk diteruskan.');
      return;
    }

    // 2. Semak jika ada slot belum diisi topik
    const unassignedCount = this.slotsWithTopics.filter(s => !s.topic || !s.topic.trim()).length;
    if (unassignedCount > 0) {
      const confirmProceed = confirm(`Terdapat ${unassignedCount} slot yang belum mempunyai topik. Adakah anda ingin teruskan?`);
      if (!confirmProceed) return;
    }

    this.isSubmitting = true;
    this.message = 'Menyimpan topik...';

    // Bina payload mengikut interface ScheduleTopicMapping
    const payload: ScheduleTopicMapping = {
      schedule_id: this.selectedScheduleId || undefined,
      user_id: this.userId,
      nama_jadual: this.namaJadual || 'Jadual RPH',
      items: this.slotsWithTopics.map(s => ({
        slot_index: s.slot_index,
        tarikh: s.tarikh,
        kelas: s.kelas,
        subject: s.subject,
        masa_mula: s.masa_mula,
        masa_tamat: s.masa_tamat,
        topic: s.topic || '',
        subtopic: s.subtopic || '',
        standard_pembelajaran: s.standard_pembelajaran || ''
      }))
    };

    // 3. Simpan data terus ke RphService (simpan secara lokal & hantar ke backend)
    this.rphService.setTopicData(payload);

    this.rphService.simpanTopics(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.message = 'Topik berjaya disimpan!';
          // Hantar payload ke parent (rph-flow) untuk berpindah ke Step 3
          this.topicsSaved.emit(payload);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Ralat simpan topik:', err);
          // Walaupun panggilan backend gagal, data sudah disimpan dalam RphService secara tempatan (memory)
          // Maka pengguna masih boleh meneruskan ke Step 3
          this.topicsSaved.emit(payload);
        }
      });
  }
}