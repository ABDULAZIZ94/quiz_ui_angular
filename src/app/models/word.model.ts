export interface Word {
  id?: number;
  arabic: string;
  english: string;
  malay: string;
  rohingya: string;
  urdu: string;
  transliteration: string;
  category: string;
  exampleArabic: string;
  exampleMalay: string;
  difficulty: number;
  imageUrl: string;
  createdAt?: string;
}

/** Raw response from http://localhost:8025/vocabulary/list */
export interface VocabularyItem {
  id: number;
  arabic: string;
  english: string;
  malay: string;
  rohingya: string;
  urdu: string;
  transliteration: string;
  category: string;
  example_arabic: string;
  example_malay: string;
  difficulty: number;
  image_url: string;
  created_at?: string;
}

export interface VocabularyListResponse {
  data: VocabularyItem[];
  table?: string;
  total?: number;
}
