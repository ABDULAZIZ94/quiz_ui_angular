import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './404.component.html',
  styleUrl: './404.component.css'
})
export class NotFoundComponent {}