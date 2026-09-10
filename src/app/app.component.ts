import { Component, HostListener, inject, OnInit } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { FlashcardComponent } from './components/flashcard/flashcard.component';
import { ControlsComponent } from './components/controls/controls.component';
import { WordListComponent } from './components/word-list/word-list.component';
import { FooterComponent } from './components/footer/footer.component';
import { FlashcardService } from './services/flashcard.service';

@Component({
  selector: 'app-root',
  imports: [
    HeaderComponent,
    ProgressBarComponent,
    FlashcardComponent,
    ControlsComponent,
    WordListComponent,
    FooterComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
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
