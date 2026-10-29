import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { CONTENT_SETTINGS } from './content.catalog';

export const PORTFOLIO_ENDPOINT = new InjectionToken<string>('PORTFOLIO_ENDPOINT', {
  providedIn: 'root', factory: () => CONTENT_SETTINGS.endpoint,
});
export const PORTFOLIO_FETCH = new InjectionToken<typeof fetch>('PORTFOLIO_FETCH', {
  providedIn: 'root', factory: () => globalThis.fetch.bind(globalThis),
});
export type EventType = 'element_clicked' | 'project_open' | 'page_view' | 'video_play' | 'video_pause' | 'video_ended';
export interface EventMetadata {
  element_id?: string;
  video_id?: string;
  video_title?: string;
  current_time_seconds?: number;
  muted?: boolean;
  referrer_host?: string;
  language?: string;
  browser_timezone?: string;
  viewport_width?: number;
}
export interface PortfolioPayload {
  owner_guid?: string;
  action: '' | 'nav';
  target: string;
  get_project: string;
  session: string;
  event_id: string;
  event_type: EventType;
  page_path: string;
  page_title: string;
  client_timestamp: string;
  metadata: EventMetadata;
}

@Injectable({ providedIn: 'root' })
export class PortfolioApi {
  private readonly document = inject(DOCUMENT);
  private readonly endpoint = inject(PORTFOLIO_ENDPOINT);
  private readonly fetch = inject(PORTFOLIO_FETCH);
  private memorySession?: { id: string; activity: number };
  private readonly storageKey = 'portfolio-tab-session';

  session(now = Date.now()): string {
    let session = this.memorySession;
    try {
      const stored = this.document.defaultView?.sessionStorage.getItem(this.storageKey);
      if (stored) session = JSON.parse(stored);
    } catch { /* Storage may be disabled; retain a tab-lifetime in-memory session. */ }
    if (!session || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.id) || !Number.isFinite(session.activity)
      || now - session.activity >= 30 * 60_000 || now < session.activity) {
      session = { id: crypto.randomUUID(), activity: now };
    }
    session.activity = now;
    this.memorySession = session;
    try { this.document.defaultView?.sessionStorage.setItem(this.storageKey, JSON.stringify(session)); } catch { /* See above. */ }
    return session.id;
  }

  payload(type: EventType, context: { path: string; title: string }, metadata: EventMetadata = {}, target = '', project = ''): PortfolioPayload {
    let referrer = '';
    try { referrer = this.document.referrer ? new URL(this.document.referrer).host : ''; } catch { /* Ignore malformed referrers. */ }
    return {
      action: type === 'element_clicked' ? 'nav' : '', target, get_project: project,
      session: this.session(), event_id: crypto.randomUUID(), event_type: type,
      page_path: context.path.split(/[?#]/, 1)[0].slice(0, 512), page_title: context.title.slice(0, 200),
      client_timestamp: new Date().toISOString(),
      metadata: {
        referrer_host: referrer.slice(0, 200), language: navigator.language.slice(0, 35),
        browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport_width: Math.min(this.document.defaultView?.innerWidth ?? 0, 20000), ...metadata,
      },
    };
  }

  /** Analytics owns its request, independently of route/content subscriptions. */
  log(payload: PortfolioPayload, keepalive = false): void {
    void this.post(payload, undefined, keepalive).catch(() => undefined);
  }

  async post(payload: PortfolioPayload, signal?: AbortSignal, keepalive = false): Promise<unknown> {
    if (!this.endpoint) throw new Error('Portfolio endpoint is not configured.');
    const url = new URL(this.endpoint);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new Error('Portfolio endpoint must be an absolute HTTPS URL.');
    }
    // Serialize once: both network retries preserve every part of the logical event.
    const guid = new URL(this.document.defaultView?.location.href ?? 'https://localhost/').searchParams.get('guid');
    const body = JSON.stringify(guid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid)
      ? { ...payload, owner_guid: guid } : payload);
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timer = setTimeout(abort, 15_000);
      try {
        const response = await this.fetch(url.href, {
          method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, body, keepalive, signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status >= 500 && attempt === 0) continue;
          throw new Error(`Portfolio request failed (${response.status}).`);
        }
        return await response.json();
      } catch (error) {
        if (signal?.aborted || attempt === 1 || (error instanceof Error && error.message.startsWith('Portfolio request failed'))) throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    }
    throw new Error('Portfolio request failed.');
  }
}
