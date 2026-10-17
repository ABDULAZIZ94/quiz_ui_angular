import { Component, inject } from '@angular/core';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-word-list',
  standalone: true,
  imports: [],
  templateUrl: './word-list.component.html',
  styleUrl: './word-list.component.css'
})
export class WordListComponent {
  flashcardService = inject(FlashcardService);

  // Fungsi apabila kad ditekan (Kekal fungsi asas)
  selectWord(index: number, event: Event): void {
    this.flashcardService.goTo(index);
    // Dibuang skrol automatik agresif, atau boleh dikawal mengikut keperluan
  }

  // Butang kecil baharu untuk paparan terus ke main flashcard dengan skrol lancar ke atas
  displayOnMain(event: Event, index: number): void {
    event.stopPropagation();
    this.flashcardService.goTo(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  speakWord(event: Event, index: number): void {
    event.stopPropagation();
    this.flashcardService.speak(this.flashcardService.words()[index]);
  }
}