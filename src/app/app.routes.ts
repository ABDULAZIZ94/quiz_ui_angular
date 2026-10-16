import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full' // Memastikan laluan utama dipencongkan dengan tepat ke landing
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/guest/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'quiz',
    loadComponent: () => import('./components/quiz/quiz.component').then(m => m.QuizComponent)
  },
  {
    path: 'testabcd',
    loadComponent: () => import('./components/testabcd/testabcd.component').then(m => m.TestabcdComponent)
  },
  {
    path: 'question',
    loadComponent: () => import('./components/question/question.component').then(m => m.QuestionComponent)
  },
  {
    path: 'highscore',
    loadComponent: () => import('./components/score/score.component').then(m => m.ScoreComponent)
  },
  {
    path: 'quizgenerator',
    loadComponent: () => import('./components/quizgenerator/quizgenerator.component').then(m => m.QuizGeneratorComponent),
    // canActivate: [authGuard] // Menambah pengawal untuk memastikan hanya pengguna yang sah boleh mengakses laluan ini
  },
  {
    path: 'quizslider',
    loadComponent: () => import('./components/quizslider/quiz-slider.component').then(m => m.QuizSliderComponent),
  },
  {
    path: 'generateslide',
    loadComponent: () => import('./components/generateslide/generateslide.component').then(m => m.GenerateSlideComponent),
    // canActivate: [authGuard] // Menambah pengawal untuk memastikan hanya pengguna yang sah boleh mengakses laluan ini
  },
  {
    path: 'flashcard2',
    loadComponent: () => import('./components/flashcard2/flashcard2.component').then(m => m.Flashcard2Component),
  },
  {
    path: 'rph',
    loadComponent: () => import('./components/rph/rph.component').then(m => m.RphComponent),
  },
  {
    path: 'rphschedule',
    loadComponent: () => import('./components/rphschedule/rph-schedule.component').then(m => m.RphScheduleComponent),
  },
  {
    path: 'rph-flow',
    loadComponent: () => import('./components/rph-flow/rph-flow.component').then(m => m.RphFlowComponent),
  },
  {
    path: 'rph-form',
    loadComponent: () => import('./components/rph2/rph-form.component').then(m => m.RphFormComponent),
  },
  {
    path: 'rph-bulk',
    loadComponent: () => import('./components/rph2bulk/rph-bulk.component').then(m => m.RphBulkComponent),
  },
  {
    path: 'quranweb',
    loadComponent: () => import('./components/quranweb/quranweb.component').then(m => m.QuranwebComponent),
  },
  {
    path: 'arabic-quiz',
    loadComponent: () => import('./components/arabic-quiz/arabic-quiz.component').then(m => m.ArabicQuizComponent),
  },
  {
    path: 'resume',
    loadComponent: () => import('./components/resume/resume.component').then(m => m.ResumeComponent)
  },
  {
    path:'urdu-quiz',
    loadComponent: () => import('./components/urdu-quiz/urdu-quiz.component').then(m => m.UrduQuizComponent)
  },
  {
    path:'chinese-card',
    loadComponent: () => import('./components/chinese-card/chinese-card.component').then(m => m.ChineseCardComponent)
  },
  // Wildcard Route (404 Page) - Mesti berada paling bawah!
  { 
    path: '404', 
    loadComponent: () => import('./components/404/404.component').then(m => m.NotFoundComponent) 
  },
  { 
    path: '**', 
    loadComponent: () => import('./components/404/404.component').then(m => m.NotFoundComponent) 
  }
];