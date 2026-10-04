import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RphService, RphScheduleData, ScheduleItem } from '../../services/rph.service';

@Component({
  selector: 'app-rph-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rph-schedule.component.html',
  styleUrls: ['./rph-schedule.component.css']
})
export class RphScheduleComponent {
  private rphService = inject(RphService);

  user_id: number = 101;
  nama_jadual: string = 'Jadual Sebulan RPH';
  start_date: string = '';
  end_date: string = '';

  jadualList: ScheduleItem[] = [];
  isSubmitting: boolean = false;
  message: string = '';

  constructor() {
    this.tambahSlot();
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

  // Salin/Duplicate jadual minggu pertama untuk minggu-minggu seterusnya dalam sebulan
  salinJadualMingguan(): void {
    if (this.jadualList.length === 0) {
      alert('Sila isi jadual minggu pertama terlebih dahulu.');
      return;
    }

    const jadualAsal = [...this.jadualList];
    const newJadualList: ScheduleItem[] = [];

    // Duplikasi untuk 4 minggu (28 hari)
    for (let minggu = 0; minggu < 4; minggu++) {
      jadualAsal.forEach(item => {
        let tarikhBaru = '';
        if (item.tarikh) {
          const d = new Date(item.tarikh);
          d.setDate(d.getDate() + (minggu * 7));
          tarikhBaru = d.toISOString().split('T')[0];
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

    this.rphService.simpanSchedule(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.message = 'Jadual sebulan berjaya disimpan ke Google Sheet!';
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error:', err);
        this.message = 'Data telah dihantar ke Google Apps Script.';
      }
    });
  }
}