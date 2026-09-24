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

  // Buat array [1, 2, 3, ..., 100]
  readonly levels = Array.from({ length: 100 }, (_, i) => i + 1);
}
