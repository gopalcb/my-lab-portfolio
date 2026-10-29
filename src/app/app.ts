import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { analyticsNotice } from '../analytics-preference';

@Component({ selector: 'app-root', imports: [RouterOutlet], template: `
  @if (notice) {
    <aside role="status" style="padding: 12px 20px; background: #eef6f1; color: #183b2b">
      {{ notice }} <a href="?analytics=on">Enable analytics</a> · <a href="?analytics=off">Exclude my visits</a>
    </aside>
  }
  <router-outlet />
` })
export class App { readonly notice = analyticsNotice; }
