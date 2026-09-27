import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit {

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.loadFooterScript();
  }

  private loadFooterScript(): void {
    const script = this.renderer.createElement('script');
    
    script.text = `
      (function(qthn){
        var d = document,
            s = d.createElement('script'),
            l = d.currentScript || d.scripts[d.scripts.length - 1];
        s.settings = qthn || {};
        s.src = "//unfoldedtrade.com/bIXzV/s.dlGHlF0nYyWKck/jeVm/9XunZzU-lIkDPSTycc0zNWjMQ/3jNYDjk/tGNjzqQP2VN/DTcP1_M/wG";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({});
    `;

    this.renderer.appendChild(this.document.body, script);
  }
}