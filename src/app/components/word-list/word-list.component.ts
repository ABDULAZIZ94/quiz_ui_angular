import { Component, inject } from '@angular/core';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-word-list',
  imports: [],
  templateUrl: './word-list.component.html',
  styleUrl: './word-list.component.css'
})
export class WordListComponent {
  flashcardService = inject(FlashcardService);

  selectWord(index: number): void {
    this.flashcardService.goTo(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  speakWord(event: Event, index: number): void {
    event.stopPropagation();
    this.flashcardService.speak(this.flashcardService.words()[index]);
  }
}
