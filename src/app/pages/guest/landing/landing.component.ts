import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service'; // Sesuaikan path jika perlu

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule], // Diperlukan untuk arahan *ngIf
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private authService = inject(AuthService);

  // Mendedahkan userRole daripada AuthService supaya boleh disemak di dalam fail HTML
  readonly userRole = this.authService.userRole;
}