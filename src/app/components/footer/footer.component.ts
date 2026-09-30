import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit {

  // Senarai URL bagi kedua-dua skrip iklan
  private adScriptUrls: string[] = [
    '//unfoldedtrade.com/bIXzV/s.dlGHlF0nYyWKck/jeVm/9XunZzU-lIkDPSTycc0zNWjMQ/3jNYDjk/tGNjzqQP2VN/DTcP1_M/wG',
    '//unfoldedtrade.com/b.XjVJs_d/Golj0vYkWycT/Eekm-9DuCZIUwlfknP/TKcr0ENVjTQp5hM/DXUltLNyz/QR2MNEDOkgwdOAQX'
  ];

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.loadFooterScripts();
  }

  private loadFooterScripts(): void {
    this.adScriptUrls.forEach((srcUrl) => {
      const script = this.renderer.createElement('script');
      
      script.text = `
        (function(qthn){
          var d = document,
              s = d.createElement('script'),
              l = d.currentScript || d.scripts[d.scripts.length - 1];
          s.settings = qthn || {};
          s.src = "${srcUrl}";
          s.async = true;
          s.referrerPolicy = 'no-referrer-when-downgrade';
          l.parentNode.insertBefore(s, l);
        })({});
      `;

      this.renderer.appendChild(this.document.body, script);
    });
  }
}