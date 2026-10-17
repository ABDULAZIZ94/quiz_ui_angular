import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlashcardService } from '../../services/flashcard.service';

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flashcard.component.html',
  styleUrls: ['./flashcard.component.css']
})
export class FlashcardComponent {
  flashcardService = inject(FlashcardService);

  // Buat array [1, 2, 3, ..., 100]
  readonly levels = Array.from({ length: 100 }, (_, i) => i + 1);

  // Kawalan buka/tutup modal tahap (Penyelesaian ralat NG9)
  isLevelModalOpen = false;

  toggleLevelModal(open: boolean): void {
    this.isLevelModalOpen = open;
  }

  selectDifficultyAndClose(level: number | null): void {
    this.flashcardService.setDifficulty(level);
    this.isLevelModalOpen = false;
  }

  refreshData(): void {
    if (typeof (this.flashcardService as any).loadFlashcardData === 'function') {
      (this.flashcardService as any).loadFlashcardData(true);
    } else if (typeof (this.flashcardService as any).refreshData === 'function') {
      (this.flashcardService as any).refreshData();
    } else {
      window.location.reload();
    }
  }
}