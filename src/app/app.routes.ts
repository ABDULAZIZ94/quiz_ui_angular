import { Routes } from '@angular/router';

import { QuizComponent } from './components/quiz/quiz.component';
import { LandingComponent } from './pages/guest/landing/landing.component';
import { NotFoundComponent } from './components/404/404.component';
import { TestabcdComponent } from './components/testabcd/testabcd.component';
import { QuestionComponent } from './components/question/question.component';
import { ScoreComponent } from './components/score/score.component';
import { QuizGeneratorComponent } from './components/quizgenerator/quizgenerator.component';
import { authGuard } from './auth.guard';
import { LoginComponent } from './components/login/login.component';
import { QuizSliderComponent } from './components/quizslider/quiz-slider.component';
import { Flashcard2Component } from './components/flashcard2/flashcardcomponent';
import { GenerateSlideComponent } from './components/generateslide/generateslide.component';

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
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'quiz',
    component: QuizComponent
  },
  {
    path: 'testabcd',
    component: TestabcdComponent
  },
  {
    path: 'question',
    component: QuestionComponent
  },
  {
    path: 'highscore',
    component: ScoreComponent
  },
  {
    path: 'quizgenerator',
    component: QuizGeneratorComponent,
    canActivate: [authGuard] // Menambah pengawal untuk memastikan hanya pengguna yang sah boleh mengakses laluan ini
  },
  {
    path: 'quizslider',
    component: QuizSliderComponent,
  },
  {
    path: 'generateslide',
    component: GenerateSlideComponent,
    canActivate: [authGuard] // Menambah pengawal untuk memastikan hanya pengguna yang sah boleh mengakses laluan ini
  },
  {
    path: 'flashcard2',
    component: Flashcard2Component,
  },
  // Wildcard Route (404 Page) - Mesti berada paling bawah!
  { 
    path: '**', 
    component: NotFoundComponent 
  },
    // Wildcard Route (404 Page) - Mesti berada paling bawah!
  { 
    path: '404', 
    component: NotFoundComponent 
  }
];