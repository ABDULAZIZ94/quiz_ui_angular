import { Routes } from '@angular/router';
import { QuizComponent } from './components/quiz/quiz.component';

export const routes: Routes = [
  { path: 'quiz', component: QuizComponent },
  { path: '', redirectTo: '/quiz', pathMatch: 'full' }
];