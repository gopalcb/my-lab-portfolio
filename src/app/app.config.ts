import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { PortfolioPage } from './portfolio-page';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter([
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      { path: 'my-works', pathMatch: 'full', redirectTo: 'projects' },
      { path: 'projects', component: PortfolioPage, data: { kind: 'projects' } },
      { path: 'projects/aws-observability-redice', pathMatch: 'full', redirectTo: 'projects/aws-observability' },
      { path: 'projects/:id', component: PortfolioPage, data: { kind: 'projects' } },
      { path: 'read', component: PortfolioPage, data: { kind: 'read' } },
      { path: 'read/linux-essentials', pathMatch: 'full', redirectTo: 'read/implementation-and-delivery' },
      { path: 'read/:id', component: PortfolioPage, data: { kind: 'read' } },
      { path: 'about-me', component: PortfolioPage, data: { kind: 'about' } },
      { path: '**', component: PortfolioPage, data: { kind: 'missing' } },
    ], withHashLocation()),
  ],
};
