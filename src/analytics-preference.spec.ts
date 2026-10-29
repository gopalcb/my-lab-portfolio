import { analyticsExcluded, initializeAnalyticsPreference, ANALYTICS_PREFERENCE_KEY } from './analytics-preference';

describe('persistent analytics preference', () => {
  afterEach(() => { localStorage.clear(); history.replaceState(null, '', '/?analytics=on'); initializeAnalyticsPreference(window); localStorage.clear(); });
  it('applies before initial requests, persists without the URL flag and allows re-enabling', () => {
    history.replaceState(null, '', '/?analytics=off');
    initializeAnalyticsPreference(window);
    expect(localStorage.getItem(ANALYTICS_PREFERENCE_KEY)).toBe('true');
    expect(location.search).toBe('');
    initializeAnalyticsPreference(window);
    expect(analyticsExcluded(window)).toBe(true);
    history.replaceState(null, '', '/?analytics=on');
    initializeAnalyticsPreference(window);
    expect(analyticsExcluded(window)).toBe(false);
  });
});
