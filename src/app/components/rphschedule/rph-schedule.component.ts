import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RphService, RphScheduleData, ScheduleItem, ScheduleJson } from '../../services/rph.service';

export interface PublishedScheduleOption {
  id: string;
  user_id: string;
  nama_jadual: string;
  start_date: string;
  end_date: string;
  scheduleRaw: ScheduleJson;
  rawRowData: any;
}

@Component({
  selector: 'app-rph-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rph-schedule.component.html',
  styleUrls: ['./rph-schedule.component.css']
})
export class RphScheduleComponent implements OnInit {
  private rphService = inject(RphService);
  private destroyRef = inject(DestroyRef);

  user_id: number = 101;
  nama_jadual: string = 'Jadual Sebulan RPH';
  start_date: string = '';
  end_date: string = '';

  jadualList: ScheduleItem[] = [];
  isSubmitting: boolean = false;
  message: string = '';

  // Variabel untuk CSV / Search & Dropdown
  publishedSchedules: PublishedScheduleOption[] = [];
  filteredPublishedSchedules: PublishedScheduleOption[] = [];
  searchQuery: string = '';
  selectedScheduleId: string = '';
  isLoadingCsv: boolean = false;

  // Harta baharu untuk kawalan dropdown
  isDropdownOpen: boolean = false;

  ngOnInit(): void {
    if (this.jadualList.length === 0) {
      this.tambahSlot();
    }
    this.loadCsvData();
  }

  // Mengambil data CSV dari Google Sheet melalui RphService
  loadCsvData(): void {
    this.isLoadingCsv = true;
    this.rphService.getPublishedCsvData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (csvRows: any[]) => {
          console.log('Data CSV diterima:', csvRows);
          this.isLoadingCsv = false;
          this.processPublishedCsv(csvRows || []);
        },
        error: (err) => {
          this.isLoadingCsv = false;
          console.error('Ralat semasa membaca data CSV:', err);
        }
      });
  }

  // Menukar rekod CSV kepada format struktur pilihan (Dropdown)
  private processPublishedCsv(rows: any[]): void {
    this.publishedSchedules = rows.map((row, index) => {
      let parsedSchedule: ScheduleJson = { nama_jadual: '', jadual: [] };

      if (row.schedule) {
        try {
          parsedSchedule = typeof row.schedule === 'string' 
            ? JSON.parse(row.schedule) 
            : row.schedule;
        } catch (e) {
          console.warn('Gagal parsing JSON schedule pada baris:', index, e);
        }
      }

      const id = row.id ? String(row.id) : `REC_${index + 1}`;
      const userId = row.user_id ? String(row.user_id) : '';
      const namaJadual = row.nama_jadual || parsedSchedule.nama_jadual || '';
      const startDate = row.start_date || '';
      const endDate = row.end_date || '';

      return {
        id: id,
        user_id: userId,
        nama_jadual: namaJadual,
        start_date: startDate,
        end_date: endDate,
        scheduleRaw: parsedSchedule,
        rawRowData: row
      };
    });

    this.onSearchChange();
  }

  // Toggle status paparan dropdown
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Menapis senarai pilihan berdasarkan kata kunci carian
  onSearchChange(): void {
    const q = this.searchQuery.trim().toLowerCase();

    if (!q) {
      this.filteredPublishedSchedules = [...this.publishedSchedules];
      return;
    }

    this.filteredPublishedSchedules = this.publishedSchedules.filter(item => {
      const matchesId = item.id ? item.id.toLowerCase().includes(q) : false;
      const matchesUserId = item.user_id ? item.user_id.toLowerCase().includes(q) : false;
      const matchesNamaJadual = item.nama_jadual ? item.nama_jadual.toLowerCase().includes(q) : false;

      const matchesJadualSlots = item.scheduleRaw?.jadual?.some(slot => 
        (slot.subject && slot.subject.toLowerCase().includes(q)) ||
        (slot.kelas && slot.kelas.toLowerCase().includes(q)) ||
        (slot.tarikh && slot.tarikh.toLowerCase().includes(q))
      ) ?? false;

      return matchesId || matchesUserId || matchesNamaJadual || matchesJadualSlots;
    });
  }

  // Memilih rekod dari dropdown
  pilihRekodJadual(option: PublishedScheduleOption): void {
    this.selectedScheduleId = option.id;
    this.searchQuery = option.nama_jadual || option.id;
    this.isDropdownOpen = false;
    this.onSelectSchedule();
  }

  // Mengisi ruangan borang secara automatik apabila jadual dipilih
  onSelectSchedule(): void {
    if (!this.selectedScheduleId) return;

    const selected = this.publishedSchedules.find(item => item.id === this.selectedScheduleId);
    if (!selected) return;

    if (selected.user_id) {
      this.user_id = Number(selected.user_id) || this.user_id;
    }
    if (selected.start_date) this.start_date = selected.start_date;
    if (selected.end_date) this.end_date = selected.end_date;
    if (selected.nama_jadual) this.nama_jadual = selected.nama_jadual;

    if (selected.scheduleRaw && Array.isArray(selected.scheduleRaw.jadual) && selected.scheduleRaw.jadual.length > 0) {
      this.jadualList = selected.scheduleRaw.jadual.map(item => ({ ...item }));
    } else {
      alert('Format jadual yang dipilih tidak mengandungi senarai slot.');
    }
  }

  // Tambah slot jadual baharu
  tambahSlot(): void {
    this.jadualList.push({
      tarikh: '',
      kelas: '',
      subject: '',
      masa_mula: '',
      masa_tamat: ''
    });
  }

  // Padam slot
  padamSlot(index: number): void {
    if (this.jadualList.length > 1) {
      this.jadualList.splice(index, 1);
    } else {
      alert('Sekurang-kurangnya satu slot dikehendaki.');
    }
  }

  // Salin jadual minggu pertama untuk 4 minggu
  salinJadualMingguan(): void {
    if (this.jadualList.length === 0) {
      alert('Sila isi jadual minggu pertama terlebih dahulu.');
      return;
    }

    const jadualAsal = [...this.jadualList];
    const newJadualList: ScheduleItem[] = [];

    for (let minggu = 0; minggu < 4; minggu++) {
      jadualAsal.forEach(item => {
        let tarikhBaru = '';
        if (item.tarikh) {
          const parts = item.tarikh.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            d.setDate(d.getDate() + (minggu * 7));
            
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            tarikhBaru = `${year}-${month}-${day}`;
          } else {
            tarikhBaru = item.tarikh;
          }
        }

        newJadualList.push({
          ...item,
          tarikh: tarikhBaru
        });
      });
    }

    this.jadualList = newJadualList;
    alert('Jadual berjaya disalin untuk 4 minggu (sebulan)!');
  }

  // Simpan ke Google Sheet melalui RphService
  simpanJadual(): void {
    if (!this.start_date || !this.end_date) {
      alert('Sila pilih Tarikh Mula dan Tarikh Tamat.');
      return;
    }

    const payload: RphScheduleData = {
      user_id: this.user_id,
      start_date: this.start_date,
      end_date: this.end_date,
      schedule: {
        nama_jadual: this.nama_jadual,
        jadual: this.jadualList
      }
    };

    this.isSubmitting = true;
    this.message = '';

    this.rphService.simpanSchedule(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.message = 'Jadual sebulan berjaya disimpan ke Google Sheet!';
          this.loadCsvData();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Ralat semasa menyimpan:', err);
          this.message = 'Data telah dihantar ke Google Apps Script.';
          this.loadCsvData();
        }
      });
  }
}