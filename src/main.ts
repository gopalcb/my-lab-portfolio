import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { legacyRouteUrl } from './legacy-route';
import { initializeAnalyticsPreference } from './analytics-preference';

const legacy = legacyRouteUrl(location.href);
if (legacy) history.replaceState(history.state, '', legacy);
initializeAnalyticsPreference(window);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
