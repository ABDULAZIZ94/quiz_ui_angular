import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RphScheduleComponent } from '../rphschedule/rph-schedule.component';
import { RphTopicComponent } from '../rph-topics/rph-topics.component';

@Component({
  selector: 'app-rph-flow',
  standalone: true,
  imports: [
    CommonModule,
    RphScheduleComponent, // Mengimport komponen Jadual (Flow 1)
    RphTopicComponent,    // Mengimport komponen Topik (Flow 2)
  ],
  templateUrl: './rph-flow.component.html',
  styleUrls: ['./rph-flow.component.css']
})
export class RphFlowComponent {
  // Kawalan Aliran (1: Schedule, 2: Topic, 3: Generate RPH)
  currentStep: number = 1;

  // Pergi ke langkah seterusnya
  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  // Kembali ke langkah sebelumnya
  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Tukar langkah terus dari stepper header
  setStep(step: number): void {
    this.currentStep = step;
  }
}