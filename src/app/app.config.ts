import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, RouteReuseStrategy, provideRouter } from '@angular/router';
import { PortfolioPage } from './portfolio-page';

// Keep the displayed document alive across project, reading and About navigation.
class PortfolioRouteReuse extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return (future.component === PortfolioPage && current.component === PortfolioPage)
      || super.shouldReuseRoute(future, current);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: PortfolioRouteReuse },
    provideRouter([
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      { path: 'my-works', pathMatch: 'full', redirectTo: 'projects' },
      { path: 'projects', component: PortfolioPage, data: { kind: 'projects' } },
      { path: 'projects/visual-agent-builder', pathMatch: 'full', redirectTo: 'projects/runtime-controller' },
      { path: 'projects/aws-observability-redice', pathMatch: 'full', redirectTo: 'projects/aws-observability' },
      { path: 'projects/agent-workflow-token-experiment', pathMatch: 'full', redirectTo: 'projects/what-burning-436m-tokens-taught-me' },
      { path: 'projects/:id', component: PortfolioPage, data: { kind: 'projects' } },
      { path: 'read', component: PortfolioPage, data: { kind: 'read' } },
      { path: 'read/linux-essentials', pathMatch: 'full', redirectTo: 'read/implementation-and-delivery' },
      { path: 'read/:id', component: PortfolioPage, data: { kind: 'read' } },
      { path: 'about-me', component: PortfolioPage, data: { kind: 'about' } },
      { path: '**', component: PortfolioPage, data: { kind: 'missing' } },
    ]),
  ],
};
