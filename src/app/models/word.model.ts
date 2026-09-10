export interface Word {
  arabic: string;
  english: string;
  translit: string;
  category: string;
  example: string;
}

/** Raw response from http://localhost:8025/vocabulary/list */
export interface VocabularyItem {
  id: number;
  arabic: string;
  english: string;
  transliteration: string;
  category: string;
  example: string;
  created_at?: string;
}

export interface VocabularyListResponse {
  data: VocabularyItem[];
  table?: string;
  total?: number;
}
