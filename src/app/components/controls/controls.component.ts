import { Component, inject } from '@angular/core';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-controls',
  imports: [],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css'
})
export class ControlsComponent {
  flashcardService = inject(FlashcardService);
}
