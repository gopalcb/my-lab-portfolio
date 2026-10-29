import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { legacyRouteUrl } from './legacy-route';

const legacy = legacyRouteUrl(location.href);
if (legacy) history.replaceState(history.state, '', legacy);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
