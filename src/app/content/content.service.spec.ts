import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { vi } from 'vitest';
import { ABOUT_ITEM, ContentService } from './content.service';
import { ContentItem } from './content.models';
import { PORTFOLIO_ENDPOINT, PORTFOLIO_FETCH, PortfolioApi } from './portfolio-api.service';

const item: ContentItem = { id: 'sample', title: 'Sample', summary: 'Example content', htmlUrl: 'projects/sample.html' };
const html = '<!doctype html><html><head><title>Sample</title></head><body><h1 id="sample">Sample</h1><a href="#sample">Contents</a></body></html>';
const response = (value: unknown) => ({ ok: true, json: async () => value }) as Response;
function setup() {
  const fetch = vi.fn().mockResolvedValue(response({ project: 'Sample', content_type: 'text/html; charset=utf-8', html }));
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
    { provide: PORTFOLIO_ENDPOINT, useValue: 'https://api.example.test/gb-portfolio/get-content' },
    { provide: PORTFOLIO_FETCH, useValue: fetch },
  ] });
  return { service: TestBed.inject(ContentService), http: TestBed.inject(HttpTestingController), fetch };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ContentService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads a renamed article through its stable API title', async () => {
    const { service, fetch } = setup();
    const next = vi.fn();
    const error = vi.fn();
    service.load({ ...item, title: 'New visible title', apiTitle: 'Sample' }).subscribe({ next, error });
    await settle();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ get_project: 'Sample', page_title: 'New visible title' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('uses local catalogs and never fetches project or About HTML directly', async () => {
    const { service, fetch } = setup();
    service.list('projects').subscribe(items => expect(items).toHaveLength(9));
    service.list('read').subscribe(items => expect(items).toHaveLength(9));
    service.load(item, false, 'document', '/projects/sample').subscribe();
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = JSON.parse(fetch.mock.calls[0][1].body);
    expect(request.get_project).toBe('Sample');
    expect(request.event_type).toBe('project_open');
    fetch.mockResolvedValue(response({ project: 'About Me', content_type: 'text/html', html }));
    service.load(ABOUT_ITEM).subscribe();
    await settle();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ get_project: 'About Me', event_type: 'page_view' });
  });

  it('removes fetched executable markup and grants only its nonce bridge script access', async () => {
    const { service, fetch } = setup();
    fetch.mockResolvedValue(response({ project: 'Sample', content_type: 'text/html', html: html.replace('</body>', '<script nonce="evil">alert(1)</script><img onerror="alert(2)" src="bad"><base href="https://evil.test"><iframe src="https://evil.test"></iframe></body>') }));
    let text = '';
    service.load(item, false, 'current-document').subscribe(value => { text = TestBed.inject(DomSanitizer).sanitize(SecurityContext.HTML, value)!; });
    await settle();
    expect(text).not.toContain('alert(');
    expect(text).not.toContain('onerror');
    expect(text).not.toContain('evil.test');
    const doc = new DOMParser().parseFromString(text, 'text/html');
    expect(doc.querySelectorAll('script')).toHaveLength(1);
    const nonce = doc.querySelector('script')!.getAttribute('nonce');
    expect(text).toContain(`script-src 'nonce-${nonce}'`);
    expect(text).toContain("connect-src 'none'");
    expect(text).toContain("frame-src 'none'");
    expect(doc.querySelector('base')!.href).toBe(new URL(item.htmlUrl, document.baseURI).href);
    expect(text).toContain('read/light.css');
    expect(text).toContain('href="about:srcdoc#sample"');
    expect(text).toContain('current-document');
  });

  it('preserves article body classes without allowing attribute injection', async () => {
    const { service, fetch } = setup();
    const source = html.replace('<body>', '<body class="observability article &quot; onload=&quot;alert(1)" onload="alert(2)">');
    fetch.mockResolvedValue(response({ project: 'Sample', content_type: 'text/html', html: source }));
    let text = '';
    service.load(item).subscribe(value => { text = TestBed.inject(DomSanitizer).sanitize(SecurityContext.HTML, value)!; });
    await settle();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    expect(doc.body.classList.contains('observability')).toBe(true);
    expect(doc.body.classList.contains('article')).toBe(true);
    expect(doc.body.hasAttribute('onload')).toBe(false);
    expect(doc.body.attributes).toHaveLength(1);
    expect(doc.querySelectorAll('script')).toHaveLength(1);
  });

  it.each([{}, { html: '' }, { html: '<h1>fragment</h1>' }, { html: '<html><body><app-root></app-root><h1>Fallback</h1></body></html>' }, { project: 'Wrong', html }])('rejects invalid API content without replacing the current document: %j', async value => {
    const { service, fetch } = setup();
    fetch.mockResolvedValue(response({ project: 'Sample', content_type: 'text/html', ...value }));
    const failed = vi.fn();
    const rendered = vi.fn();
    service.load(item).subscribe({ next: rendered, error: failed });
    await settle();
    expect(failed).toHaveBeenCalledOnce();
    expect(rendered).not.toHaveBeenCalled();
  });

  it('preserves the entire request for manual retry but renews a subsequent navigation event', async () => {
    const { service, fetch } = setup();
    fetch.mockResolvedValue(response({}));
    service.load(item).subscribe({ error: () => undefined });
    await settle();
    service.load(item, true).subscribe({ error: () => undefined });
    await settle();
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
    service.load(item).subscribe({ error: () => undefined });
    await settle();
    expect(fetch.mock.calls[2][1].body).not.toBe(fetch.mock.calls[0][1].body);
  });

  it('aborts stale content without cancelling independent analytics and ignores a late response', async () => {
    const { service, fetch } = setup();
    let finish!: (value: Response) => void;
    fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const rendered = vi.fn();
    const subscription = service.load(item).subscribe(rendered);
    const api = TestBed.inject(PortfolioApi);
    api.log(api.payload('element_clicked', { path: '/', title: 'Portfolio' }, { element_id: 'nav' }, 'Sample'));
    subscription.unsubscribe();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetch.mock.calls[1][1].signal.aborted).toBe(false);
    finish(response({ project: 'Sample', content_type: 'text/html', html }));
    await settle();
    expect(rendered).not.toHaveBeenCalled();
  });

  it('keeps read HTML local and sends an independent page view', () => {
    const { service, fetch, http } = setup();
    service.load({ ...item, htmlUrl: 'read/sample.html' }).subscribe();
    http.expectOne(r => r.url.endsWith('/read/sample.html')).flush(html);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ event_type: 'page_view', get_project: '' });
  });
});
