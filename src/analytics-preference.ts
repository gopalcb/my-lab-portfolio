export const ANALYTICS_PREFERENCE_KEY = 'portfolio-analytics-excluded';
let fallbackExcluded = false;
export let analyticsNotice = '';

export function analyticsExcluded(view: Window | null): boolean {
  try { return view?.localStorage.getItem(ANALYTICS_PREFERENCE_KEY) === 'true' || fallbackExcluded; }
  catch { return fallbackExcluded; }
}

/** Apply the explicit preference before Angular can issue its initial content request. */
export function initializeAnalyticsPreference(view: Window): void {
  const url = new URL(view.location.href);
  const preference = url.searchParams.get('analytics');
  if (preference !== 'off' && preference !== 'on') return;
  fallbackExcluded = preference === 'off';
  try {
    view.localStorage.setItem(ANALYTICS_PREFERENCE_KEY, String(fallbackExcluded));
    analyticsNotice = fallbackExcluded
      ? 'Your visits are excluded on this browser. This remains until you clear site data or enable analytics again.'
      : 'Analytics is enabled on this browser.';
    fallbackExcluded = false;
  } catch {
    analyticsNotice = fallbackExcluded
      ? 'Your visits are excluded for this page session only. Browser storage is unavailable; open the exclusion link again on your next visit.'
      : 'Analytics is enabled for this page session. Browser storage is unavailable.';
  }
  url.searchParams.delete('analytics');
  view.history.replaceState(view.history.state, '', url.href);
}
