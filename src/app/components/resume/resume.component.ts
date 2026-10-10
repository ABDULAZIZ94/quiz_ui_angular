
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ResumeProfile {
  full_name: string;
  job_title?: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url?: string;
  website_url?: string;
  summary: string;
}

interface ResumeData {
  profile: ResumeProfile;
  experiences: {
    job_title: string;
    company_name: string;
    location?: string;
    start_date: string;
    end_date: string;
    description: string;
    achievements?: string[];
  }[];
  educations: {
    degree?: string;
    degree_name?: string;
    institution: string;
    start_year: string | number;
    end_year?: string | number;
    grade_description?: string;
  }[];
  skills: (string | {
    category?: string;
    skill_name?: string;
    proficiency_level?: string;
  })[];
  certifications?: {
    cert_name: string;
    issuing_body?: string;
    issue_year?: string | number;
    expiry_year?: string | number;
  }[];
  awards?: { title: string; description?: string }[];
  languages?: { name: string; level: string }[];
}

@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume.component.html',
  styleUrl: './resume.component.css'
})
export class ResumeComponent implements OnInit {
  private readonly apiUrl =
    'https://script.google.com/macros/s/AKfycbz-sMW5rK_0Op4BeipGYTyyvpLy6_qhpHmmlk7eJ-kVSsV3g8Hd7s6A0EYyg0AdnJg0eA/exec';

  requestBody = {
    tema: 'kerja software engineer',
    arahan_tambahan: 'ceritakan pengalaman dan pendidikan saya'
  };

  data: ResumeData = {
    profile: {
      full_name: '',
      job_title: 'Software Engineer',
      email: '',
      phone: '',
      location: '',
      linkedin_url: '',
      summary: ''
    },
    experiences: [],
    educations: [],
    skills: []
  };

  activeTab: 'resume' | 'db' = 'resume';
  editMode = false;
  loading = false;
  error = '';

  readonly dbTables = [
    {
      name: 'profiles',
      description: 'Profil Utama Pengguna',
      columns: [
        ['id', 'BIGINT', 'PK, AUTO_INC', 'ID unik profil'],
        ['full_name', 'VARCHAR(150)', 'NOT NULL', 'Nama penuh'],
        ['job_title', 'VARCHAR(150)', 'NOT NULL', 'Jawatan utama'],
        ['executive_summary', 'TEXT', 'NULLABLE', 'Ringkasan profesional'],
        ['email', 'VARCHAR(100)', 'UNIQUE, NOT NULL', 'Alamat e-mel'],
        ['phone', 'VARCHAR(30)', 'NOT NULL', 'Nombor telefon'],
        ['location', 'VARCHAR(100)', 'NOT NULL', 'Lokasi'],
        ['linkedin_url', 'VARCHAR(255)', 'NULLABLE', 'Pautan LinkedIn'],
        ['website_url', 'VARCHAR(255)', 'NULLABLE', 'Laman web'],
        ['created_at', 'TIMESTAMP', 'DEFAULT CURRENT_TIMESTAMP', 'Tarikh rekod']
      ]
    },
    {
      name: 'experiences',
      description: 'Pengalaman Kerja',
      columns: [
        ['id', 'BIGINT', 'PK, AUTO_INC', 'ID pengalaman'],
        ['profile_id', 'BIGINT', 'FK (profiles.id)', 'Rujukan profil'],
        ['job_title', 'VARCHAR(150)', 'NOT NULL', 'Jawatan'],
        ['company_name', 'VARCHAR(150)', 'NOT NULL', 'Nama syarikat'],
        ['location', 'VARCHAR(100)', 'NULLABLE', 'Lokasi syarikat'],
        ['start_date', 'DATE', 'NOT NULL', 'Tarikh mula'],
        ['end_date', 'DATE', 'NULLABLE', 'Tarikh tamat'],
        ['is_current', 'BOOLEAN', 'DEFAULT FALSE', 'Jawatan semasa'],
        ['achievements_json', 'JSON', 'NULLABLE', 'Pencapaian']
      ]
    },
    {
      name: 'educations',
      description: 'Kelayakan Akademik',
      columns: [
        ['id', 'BIGINT', 'PK, AUTO_INC', 'ID pendidikan'],
        ['profile_id', 'BIGINT', 'FK (profiles.id)', 'Rujukan profil'],
        ['degree_name', 'VARCHAR(150)', 'NOT NULL', 'Nama kelayakan'],
        ['institution', 'VARCHAR(150)', 'NOT NULL', 'Institusi'],
        ['start_year', 'INT', 'NOT NULL', 'Tahun mula'],
        ['end_year', 'INT', 'NULLABLE', 'Tahun tamat'],
        ['grade_description', 'VARCHAR(100)', 'NULLABLE', 'Gred']
      ]
    },
    {
      name: 'certifications',
      description: 'Pensijilan Profesional',
      columns: [
        ['id', 'BIGINT', 'PK', 'ID sijil'],
        ['profile_id', 'BIGINT', 'FK', 'Rujukan profil'],
        ['cert_name', 'VARCHAR(150)', 'NOT NULL', 'Nama sijil'],
        ['issuing_body', 'VARCHAR(150)', 'NULLABLE', 'Badan pengeluar'],
        ['issue_year', 'INT', 'NULLABLE', 'Tahun dikeluarkan'],
        ['expiry_year', 'INT', 'NULLABLE', 'Tahun luput']
      ]
    },
    {
      name: 'skills',
      description: 'Kemahiran',
      columns: [
        ['id', 'BIGINT', 'PK', 'ID kemahiran'],
        ['profile_id', 'BIGINT', 'FK', 'Rujukan profil'],
        ['category', 'VARCHAR(50)', 'NULLABLE', 'Kategori'],
        ['skill_name', 'VARCHAR(100)', 'NOT NULL', 'Nama kemahiran'],
        ['proficiency_level', 'VARCHAR(30)', 'NULLABLE', 'Tahap kemahiran']
      ]
    }
  ];

  ngOnInit(): void {
    this.loadResume();
  }

tema = 'kerja software engineer';

arahanTambahan = 'ceritakan pengalaman dan pendidikan saya';

async loadResume(): Promise<void> {
  this.loading = true;
  this.error = '';

  try {
    const requestBody = {
      tema: this.tema,
      arahan_tambahan: this.arahanTambahan
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API memulangkan HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== 'success' || !result.data?.profile) {
      throw new Error(
        result.message || 'Format data API tidak sah.'
      );
    }

    this.data = {
      profile: {
        job_title: 'Software Engineer',
        ...result.data.profile
      },
      experiences: result.data.experiences ?? [],
      educations: result.data.educations ?? [],
      skills: result.data.skills ?? [],
      certifications: result.data.certifications ?? [],
      awards: result.data.awards ?? [],
      languages: result.data.languages ?? []
    };

  } catch (e) {
    this.error = e instanceof Error
      ? e.message
      : 'Tidak berjaya mendapatkan data resume.';
  } finally {
    this.loading = false;
  }
}

  switchTab(tab: 'resume' | 'db'): void {
    this.activeTab = tab;
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
  }

  printResume(): void {
    window.print();
  }

  getSkillName(skill: ResumeData['skills'][number]): string {
    return typeof skill === 'string' ? skill : skill.skill_name ?? '';
  }

  getEducationDegree(education: ResumeData['educations'][number]): string {
    return education.degree ?? education.degree_name ?? '';
  }

  getDescriptionItems(description: string): string[] {
    return description
      .split(/\n|•/)
      .map(item => item.trim())
      .filter(Boolean);
  }
}
