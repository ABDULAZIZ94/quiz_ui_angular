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
import { RphComponent } from './components/rph/rph.component';
import { RphScheduleComponent } from './components/rphschedule/rph-schedule.component';
import { RphFlowComponent } from './components/rph-flow/rph-flow.component';
import { RphFormComponent } from './components/rph2/rph-form.component';
import { RphBulkComponent } from './components/rph2bulk/rph-bulk.component';
import { QuranwebComponent } from './components/quranweb/quranweb.component';

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
    // canActivate: [authGuard] // Menambah pengawal untuk memastikan hanya pengguna yang sah boleh mengakses laluan ini
  },
  {
    path: 'quizslider',
    component: QuizSliderComponent,
  },
  {
    path: 'generateslide',
    component: GenerateSlideComponent,
    // canActivate: [authGuard] // Menambah pengawal untuk memastikan hanya pengguna yang sah boleh mengakses laluan ini
  },
  {
    path: 'flashcard2',
    component: Flashcard2Component,
  },
  {
    path: 'rph',
    component: RphComponent,
  },
  {
    path: 'rphschedule',
    component: RphScheduleComponent,
  },
  {
    path: 'rph-flow',
    component: RphFlowComponent,
  },
  {
    path: 'rph-form',
    component: RphFormComponent,
  },
  {
    path: 'rph-bulk',
    component: RphBulkComponent,
  },
  {
    path: 'quranweb',
    component: QuranwebComponent,
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