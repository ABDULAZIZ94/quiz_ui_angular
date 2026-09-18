import { Routes } from '@angular/router';

import { QuizComponent } from './components/quiz/quiz.component';
import { LandingComponent } from './pages/guest/landing/landing.component';
import { NotFoundComponent } from './components/404/404.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full' // Memastikan laluan utama dipencongkan dengan tepat ke landing
  },
  {
    path: 'landing',
    component: LandingComponent
  },
  {
    path: 'quiz',
    component: QuizComponent
  },
  // Wildcard Route (404 Page) - Mesti berada paling bawah!
  { 
    path: '**', 
    component: NotFoundComponent 
  }
];