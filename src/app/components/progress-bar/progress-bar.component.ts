import { Component, inject } from '@angular/core';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-progress-bar',
  imports: [],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.css'
})
export class ProgressBarComponent {
  flashcardService = inject(FlashcardService);
}
