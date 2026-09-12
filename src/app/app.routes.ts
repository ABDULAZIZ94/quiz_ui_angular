import { Routes } from '@angular/router';

import { QuizComponent } from './components/quiz/quiz.component';
import { LandingComponent } from './pages/guest/landing/landing.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },

  {
    path: 'quiz',
    component: QuizComponent
  }
];