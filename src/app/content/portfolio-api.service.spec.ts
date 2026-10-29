import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PORTFOLIO_ENDPOINT, PORTFOLIO_FETCH, PortfolioApi } from './portfolio-api.service';

function setup(endpoint = 'https://api.example.test/gb-portfolio/get-content') {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  TestBed.configureTestingModule({ providers: [
    { provide: PORTFOLIO_ENDPOINT, useValue: endpoint }, { provide: PORTFOLIO_FETCH, useValue: fetch },
  ] });
  return { api: TestBed.inject(PortfolioApi), fetch };
}
const context = { path: '/projects/sample?private=value#anchor', title: 'Sample' };

describe('PortfolioApi', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('passes the bookmarked GUID to Lambda without using the former browser preference', async () => {
    const { api, fetch } = setup();
    const guid = 'bda9e542-3044-4f9e-9b8e-1a6cf7dc6f88';
    history.replaceState(null, '', '/?guid=' + guid);
    await api.post(api.payload('page_view', context));
    expect(JSON.parse(fetch.mock.calls[0][1].body).owner_guid).toBe(guid);
    history.replaceState(null, '', '/');
    localStorage.setItem('portfolio-analytics-excluded', 'true');
    api.log(api.payload('page_view', context));
    expect(JSON.parse(fetch.mock.calls[1][1].body).owner_guid).toBeUndefined();
    expect(JSON.parse(fetch.mock.calls[1][1].body).analytics_excluded).toBeUndefined();
  });

  it('shares tab storage, refreshes activity, and rotates after thirty minutes idle', () => {
    const { api } = setup();
    const first = api.session(100);
    expect(api.session(100 + 29 * 60_000)).toBe(first);
    expect(api.session(100 + 58 * 60_000)).toBe(first);
    expect(api.session(100 + 88 * 60_000)).not.toBe(first);
    expect(JSON.parse(sessionStorage.getItem('portfolio-tab-session')!).activity).toBe(100 + 88 * 60_000);
  });

  it('recovers corrupted session storage and works when storage is blocked', () => {
    sessionStorage.setItem('portfolio-tab-session', '{');
    const { api } = setup();
    const first = api.session(100);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(api.session(200)).toBe(first);
  });

  it('builds separate click/content events in one session and excludes query/fragment data', () => {
    const { api } = setup();
    const click = api.payload('element_clicked', context, { element_id: 'sample-menu' }, 'Sample');
    const content = api.payload('project_open', context, {}, '', 'Sample');
    expect(click).toMatchObject({ action: 'nav', target: 'Sample', get_project: '', page_path: '/projects/sample' });
    expect(content).toMatchObject({ action: '', target: '', get_project: 'Sample' });
    expect(click.event_id).not.toBe(content.event_id);
    expect(click.session).toBe(content.session);
  });

  it('retries transient failures with identical serialized ID, timestamp and metadata', async () => {
    const { api, fetch } = setup();
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    const payload = api.payload('project_open', context, {}, '', 'Sample');
    await api.post(payload);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(payload);
  });

  it('does not retry permanent validation failures', async () => {
    const { api, fetch } = setup();
    fetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(api.post(api.payload('page_view', context))).rejects.toThrow('400');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses JSON CORS without credentials or caching and keeps external clicks alive', async () => {
    const { api, fetch } = setup();
    api.log(api.payload('element_clicked', context, { element_id: 'github' }, 'GitHub'), true);
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', keepalive: true, headers: { 'Content-Type': 'application/json' } });
    await Promise.resolve();
  });

  it('fails clearly without a configured absolute endpoint', async () => {
    const { api, fetch } = setup('');
    await expect(api.post(api.payload('page_view', context))).rejects.toThrow('not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('builds native playback without fabricating a click', () => {
    const { api } = setup();
    expect(api.payload('video_play', context, { video_id: 'demo', video_title: 'Demo', current_time_seconds: 15, muted: true }))
      .toMatchObject({ action: '', target: '', get_project: '', event_type: 'video_play', metadata: { current_time_seconds: 15 } });
  });
});
