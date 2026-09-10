import { Component, inject } from '@angular/core';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-flashcard',
  imports: [],
  templateUrl: './flashcard.component.html',
  styleUrl: './flashcard.component.css'
})
export class FlashcardComponent {
  flashcardService = inject(FlashcardService);
}
