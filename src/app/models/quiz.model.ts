export interface Quiz {
  id?: string | number;
  title: string;
  description: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questions?: QuizQuestion[];
  created_at?: string;
  updated_at?: string;
}

export interface QuizQuestion {
  id?: string | number;
  quiz_id?: string | number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export interface QuizListResponse {
  quizzes: Quiz[];
  total?: number;
  page?: number;
  page_size?: number;
}
