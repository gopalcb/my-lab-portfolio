import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { vi } from 'vitest';
import { CONTENT_CONFIG, ContentService } from './content.service';
import { ContentItem, ContentSettings } from './content.models';

const item: ContentItem = { id: 'sample', title: 'Sample', summary: 'Example content', htmlUrl: 'projects/sample.html' };
const html = '<!doctype html><html><head><title>Sample</title></head><body><h1 id="sample">Sample</h1><a href="#sample">Contents</a></body></html>';

function setup(config: ContentSettings = { catalogApiBaseUrl: null, contentOrigins: [] }) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: CONTENT_CONFIG, useValue: config }] });
  return { service: TestBed.inject(ContentService), http: TestBed.inject(HttpTestingController) };
}

describe('ContentService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('returns distinct local object catalogs without making list requests', () => {
    const { service } = setup();
    service.list('projects').subscribe(items => expect(items).toHaveLength(6));
    service.list('read').subscribe(items => expect(items).toHaveLength(9));
  });

  it('supports the future API contract and an explicitly approved HTTPS content origin', () => {
    const { service, http } = setup({ catalogApiBaseUrl: '/api/content', contentOrigins: ['https://content.example.com'] });
    service.list('projects').subscribe(items => expect(items[0].htmlUrl).toBe('https://content.example.com/sample.html'));
    http.expectOne('/api/content/projects').flush([{ ...item, htmlUrl: 'https://content.example.com/sample.html' }]);
  });

  it('preserves an optional API topic without requiring it from older catalogs', () => {
    const { service, http } = setup({ catalogApiBaseUrl: '/api/content', contentOrigins: [] });
    service.list('read').subscribe(items => {
      expect(items[0].topic).toBe('CODEX WORKSPACE');
      expect(items[1].topic).toBeUndefined();
    });
    http.expectOne('/api/content/read').flush([{ ...item, topic: ' CODEX WORKSPACE ' }, { ...item, id: 'older-item' }]);
  });

  it.each([
    { body: {} },
    { body: [{ ...item }, { ...item }] },
    { body: [{ ...item, id: '../escape' }] },
    { body: [{ ...item, title: '' }] },
    { body: [{ ...item, topic: 42 }] },
    { body: [{ ...item, topic: ' ' }] },
    { body: [{ ...item, htmlUrl: 'https://unapproved.example/sample.html' }] },
    { body: [{ ...item, htmlUrl: 'javascript:alert(1)' }] },
    { body: [{ ...item, htmlUrl: 'data:text/html,<h1>bad</h1>' }] },
  ])('rejects malformed or unsafe API metadata: $body', ({ body }) => {
    const { service, http } = setup({ catalogApiBaseUrl: '/api/content', contentOrigins: [] });
    let failed = false;
    service.list('read').subscribe({ error: () => { failed = true; } });
    http.expectOne('/api/content/read').flush(body);
    expect(failed).toBe(true);
  });

  it('accepts an empty API list and surfaces an API failure instead of silently using fixtures', () => {
    const { service, http } = setup({ catalogApiBaseUrl: '/api/content', contentOrigins: [] });
    service.list('read').subscribe(items => expect(items).toEqual([]));
    http.expectOne('/api/content/read').flush([]);
    let failed = false;
    service.list('projects').subscribe({ error: () => { failed = true; } });
    http.expectOne('/api/content/projects').flush('unavailable', { status: 503, statusText: 'Unavailable' });
    expect(failed).toBe(true);
  });

  it('fetches HTML as text and adds the isolation policy and asset base before fetched markup', () => {
    const { service, http } = setup();
    service.load(item).subscribe(value => {
      const text = TestBed.inject(DomSanitizer).sanitize(SecurityContext.HTML, value)!;
      expect(text).toContain("script-src 'none'");
      expect(text).toContain(`media-src ${new URL('projects/assets/visual-agent-builder/runtime-controller-demo.mp4', document.baseURI).href};`);
      expect(text).toContain("frame-src 'none'");
      expect(text).toContain("connect-src 'none'");
      expect(text).toContain("form-action 'none'");
      expect(text).toContain('<base href="');
      expect(text).toContain('<html lang="en" data-portfolio-theme="light">');
      expect(text).toContain('read/light.css');
      expect(text).toContain('href="about:srcdoc#sample"');
      expect(text.indexOf('Content-Security-Policy')).toBeLessThan(text.indexOf('<title>Sample'));
    });
    const request = http.expectOne(r => r.url.endsWith('/projects/sample.html'));
    expect(request.request.responseType).toBe('text');
    expect(request.request.withCredentials).toBe(false);
    request.flush(html);
  });

  it.each(['', '<html><body><app-root></app-root><h1>SPA fallback</h1></body></html>', '{"not":"html"}'])('rejects empty/non-document and SPA fallback responses', body => {
    const { service, http } = setup();
    let failed = false;
    service.load(item).subscribe({ error: () => { failed = true; } });
    http.expectOne(r => r.url.endsWith('/projects/sample.html')).flush(body);
    expect(failed).toBe(true);
  });

  it('aborts an obsolete HTML request when the subscriber switches away', () => {
    const { service, http } = setup();
    const subscription = service.load(item).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/projects/sample.html'));
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
  });
  it('times out a stalled document request and aborts it', () => {
    vi.useFakeTimers();
    try {
      const { service, http } = setup();
      let failed = false;
      service.load(item).subscribe({ error: () => { failed = true; } });
      const request = http.expectOne(r => r.url.endsWith('/projects/sample.html'));
      vi.advanceTimersByTime(15_001);
      expect(failed).toBe(true);
      expect(request.cancelled).toBe(true);
    } finally { vi.useRealTimers(); }
  });

});
