import { Component, HostListener, inject, OnInit } from '@angular/core';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import { FlashcardComponent } from '../flashcard/flashcard.component';
import { ControlsComponent } from '../controls/controls.component';
import { WordListComponent } from '../word-list/word-list.component';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-root',
  imports: [
    ProgressBarComponent,
    FlashcardComponent,
    ControlsComponent,
    WordListComponent,
  ],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  flashcardService = inject(FlashcardService);

  ngOnInit(): void {
    // Fetch vocabulary from Golang backend (port 8025) and merge with static words
    this.flashcardService.loadVocabulary();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.flashcardService.next();
    else if (event.key === 'ArrowLeft') this.flashcardService.prev();
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.flashcardService.flip();
    }
  }
}
