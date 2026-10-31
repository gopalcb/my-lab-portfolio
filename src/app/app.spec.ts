import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { appConfig } from './app.config';
import { PortfolioPage } from './portfolio-page';
import { ContentService } from './content/content.service';
import { LOCAL_CATALOG } from './content/content.catalog';
import { ContentItem, ContentKind } from './content/content.models';
import { vi } from 'vitest';
import { PortfolioApi } from './content/portfolio-api.service';
import { SafeHtml } from '@angular/platform-browser';

const service = {
  list: (kind: ContentKind) => of([...LOCAL_CATALOG[kind]]),
  load: (item: ContentItem) => of(`<html><body><h1>${item.title}</h1></body></html>` as SafeHtml),
};

function configure(overrides: Partial<typeof service> = {}) {
  TestBed.configureTestingModule({ providers: [...appConfig.providers, { provide: ContentService, useValue: { ...service, ...overrides, displayed: undefined } }, { provide: PortfolioApi, useValue: { log: vi.fn(), payload: vi.fn((...args) => args) } }] });
}

describe('Portfolio route state', () => {
  it('opens the agent file sharing project from its direct route', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/agent-file-sharing-network-langchain-mcp-oauth-and-aws', PortfolioPage);
    expect(page.state().selected?.title).toBe('agent file sharing network: langchain mcp, oauth and aws');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('agent file sharing network: langchain mcp, oauth and aws');
  });

  it('opens About through content delivery and profile links in separate tabs', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/about-me', PortfolioPage);
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('About Me');
    const links = [...harness.routeNativeElement!.querySelectorAll('.sidebar-social a')];
    expect(links.map(link => link.getAttribute('href'))).toEqual(['https://github.com/gopalcb', 'https://www.linkedin.com/in/gopal-c-bala']);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('opens the observability article from the supplied redice URL', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/aws-observability-redice', PortfolioPage);
    expect(TestBed.inject(Router).url).toBe('/projects/aws-observability');
    expect(page.state().selected?.id).toBe('aws-observability');
    expect(harness.routeNativeElement!.querySelector('iframe')).not.toBeNull();
  });

  it('shows the requested project order and opens the harness by default', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects', PortfolioPage);
    const links = [...harness.routeNativeElement!.querySelectorAll('.item-list a')];
    expect(links.map(link => link.textContent?.trim())).toEqual([
      'Deep Agents harness with LangGraph and Codex',
      'OpenTelemetry implementation lab',
      'agent file sharing network: langchain mcp, oauth and aws',
      'What Burning 436M Tokens Taught Me',
      'Customizing agents and runtime',
    ]);
    expect(links[0].getAttribute('href')).toContain('/projects/deep-agent-harness-with-codex');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('Deep Agents harness with LangGraph and Codex');
    expect(harness.routeNativeElement!.querySelector('.site-nav')?.textContent).toContain('Projects');
    expect(harness.routeNativeElement!.querySelector('.site-nav a[href="/read"]')).toBeNull();
  });

  it('redirects the previous Runtime Controller URL to its renamed route', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/visual-agent-builder', PortfolioPage);
    expect(TestBed.inject(Router).url).toBe('/projects/runtime-controller');
    expect(page.state().selected?.id).toBe('runtime-controller');
    expect(harness.routeNativeElement!.querySelector('.item-list a[href="/projects/runtime-controller"]')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('Runtime Controller');
  });

  it('redirects the previous token article URL to its renamed route', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/agent-workflow-token-experiment', PortfolioPage);
    expect(TestBed.inject(Router).url).toBe('/projects/what-burning-436m-tokens-taught-me');
    expect(page.state().selected?.id).toBe('what-burning-436m-tokens-taught-me');
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('What Burning 436M Tokens Taught Me');
  });

  it('loads the AWS observability project as completed portfolio content', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/aws-observability', PortfolioPage);
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('OpenTelemetry implementation lab');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toContain('OpenTelemetry implementation lab');
  });

  it('loads each section catalog and highlights only the selected title', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/my-customized-agents-and-runtime', PortfolioPage);
    expect(harness.routeNativeElement!.querySelectorAll('.item-list a')).toHaveLength(5);
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('Customizing agents and runtime');
    const reading = await harness.navigateByUrl('/read/kubernetes-networking', PortfolioPage);
    reading.frameLoaded(reading.state().documentId!);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelectorAll('.item-list a')).toHaveLength(9);
    expect(harness.routeNativeElement!.querySelectorAll('.item-list [aria-current]')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('Kubernetes networking');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toContain('Kubernetes networking');
  });

  it('renders the first item on a section entry without queuing another navigation', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/read', PortfolioPage);
    expect(page.state().selected?.id).toBe('eks-architecture');
    expect(page.state().phase).toBe('ready');
    expect(TestBed.inject(Router).url).toBe('/read');
  });

  it('groups legacy catalogs without topic metadata under Dev notes', async () => {
    configure({ list: kind => of(LOCAL_CATALOG[kind].map(item => ({ ...item, topic: undefined }))) });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/read', PortfolioPage);
    const headings = harness.routeNativeElement!.querySelectorAll('.topic-label');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('DEV NOTES');
    expect(harness.routeNativeElement!.querySelectorAll('.item-list a')).toHaveLength(9);
  });


  it('redirects the former Linux article to the merged implementation article', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/read/linux-essentials', PortfolioPage);
    expect(TestBed.inject(Router).url).toBe('/read/implementation-and-delivery');
    expect(page.state().selected?.id).toBe('implementation-and-delivery');
    expect(harness.routeNativeElement!.querySelector('.nav-label')?.textContent).toBe('EKS MICROSERVICES');
  });

  it('shows unknown content IDs without selecting an unrelated item', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/unknown', PortfolioPage);
    expect(harness.routeNativeElement!.textContent).toContain('Page not found.');
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('iframe')).toBeNull();
  });

  it('shows catalog failures with retry', async () => {
    configure({ list: () => throwError(() => new Error('API unavailable')) });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/read/linux-essentials', PortfolioPage);
    expect(harness.routeNativeElement!.textContent).toContain('Titles couldn’t be loaded.');
    expect(harness.routeNativeElement!.querySelector('button')?.textContent).toContain('Try again');
  });

  it('shows empty catalogs and HTML failures as separate states', async () => {
    configure({ list: kind => kind === 'read' ? of([]) : service.list(kind), load: () => throwError(() => new Error('HTML unavailable')) });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/read', PortfolioPage);
    expect(harness.routeNativeElement!.textContent).toContain('Nothing published yet.');
    await harness.navigateByUrl('/projects/my-customized-agents-and-runtime', PortfolioPage);
    expect(harness.routeNativeElement!.textContent).toContain('This page couldn’t be loaded.');
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('Customizing agents and runtime');
  });

  it('removes theme switching even when a previous dark preference is stored', async () => {
    const previous = localStorage.getItem('my-work-portfolio-theme');
    localStorage.setItem('my-work-portfolio-theme', 'dark');
    try {
      configure();
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/projects/visual-agent-builder', PortfolioPage);
      expect(harness.routeNativeElement!.querySelector('.theme-toggle')).toBeNull();
      expect(harness.routeNativeElement!.querySelector('[aria-label*="mode"]')).toBeNull();
      expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('Runtime Controller');
    } finally {
      if (previous === null) localStorage.removeItem('my-work-portfolio-theme');
      else localStorage.setItem('my-work-portfolio-theme', previous);
    }
  });
});

describe('Portfolio API route integration', () => {
  const html = '<html><body><h1>Content</h1></body></html>';
  async function configureApi() {
    const { PORTFOLIO_ENDPOINT, PORTFOLIO_FETCH } = await import('./content/portfolio-api.service');
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(init.body as string);
      return { ok: true, json: async () => payload.get_project ? { html, project: payload.get_project, content_type: 'text/html; charset=utf-8' } : {} } as Response;
    });
    TestBed.configureTestingModule({ providers: [...appConfig.providers,
      { provide: PORTFOLIO_ENDPOINT, useValue: 'https://api.example.test/gb-portfolio/get-content' },
      { provide: PORTFOLIO_FETCH, useValue: fetch },
    ] });
    return fetch;
  }

  it('keeps the loaded frame until the next frame loads and ignores superseded load events', async () => {
    const fetch = await configureApi();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/visual-agent-builder', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    page.frameLoaded(page.state().documentId!);
    harness.detectChanges();
    const first = page.displayed()!.documentId;
    // JSDOM emits immediate iframe loads; control asset readiness explicitly.
    const completeFrame = page.frameLoaded.bind(page);
    vi.spyOn(page, 'frameLoaded').mockImplementation(() => {});
    await harness.navigateByUrl('/projects/aws-observability', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    const incoming = page.state().documentId!;
    expect(page.displayed()!.documentId).toBe(first);
    expect(page.frameViews().map(view => view.pending)).toEqual([false, true]);
    expect(page.loading()).toBe(true);
    await harness.navigateByUrl('/projects/my-customized-agents-and-runtime', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    completeFrame(incoming);
    expect(page.displayed()!.documentId).toBe(first);
    completeFrame(page.state().documentId!);
    expect(page.loading()).toBe(false);
    expect(page.frameViews()).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('bounds frame loading and preserves the visible page on asset timeout', async () => {
    await configureApi();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/visual-agent-builder', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    page.frameLoaded(page.state().documentId!);
    harness.detectChanges();
    const first = page.displayed()!.documentId;
    // JSDOM emits immediate iframe loads; control asset readiness explicitly.
    const completeFrame = page.frameLoaded.bind(page);
    vi.spyOn(page, 'frameLoaded').mockImplementation(() => {});
    let expire: (() => void) | undefined;
    const schedule = globalThis.setTimeout;
    const timer = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, delay?: number) => {
      if (delay === 20_000) expire = callback;
      return schedule(callback, delay);
    }) as typeof setTimeout);
    try {
      await harness.navigateByUrl('/projects/aws-observability', PortfolioPage);
      await new Promise(resolve => schedule(resolve, 0));
      harness.detectChanges();
      const incoming = page.state().documentId!;
      expect(expire).toBeDefined();
      expire!();
      harness.detectChanges();
      expect(page.renderFailed()).toBe(incoming);
      expect(page.displayed()!.documentId).toBe(first);
      completeFrame(incoming);
      expect(page.displayed()!.documentId).toBe(first);
      expect(harness.routeNativeElement!.textContent).toContain('Try again');
    } finally { timer.mockRestore(); }
  });

  it('redirects home to its first project with a single project_open and no fabricated click/home event', async () => {
    const fetch = await configureApi();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/projects');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toMatchObject({ event_type: 'project_open', get_project: 'Deep Agents harness with LangGraph and Codex', page_path: '/projects' });
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });

  it('records unknown project routes once without fetching content or duplicating on retry', async () => {
    const fetch = await configureApi();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/unknown-project', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toMatchObject({ event_type: 'page_view', get_project: '', page_path: '/projects/unknown-project' });
    expect(harness.routeNativeElement!.querySelector('iframe')).toBeNull();
    page.retry();
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends separate same-session click and About content events and navigates while click logging is pending', async () => {
    const fetch = await configureApi();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    // This unresolved analytics response must not block About content delivery.
    const original = fetch.getMockImplementation()!;
    let finishLog!: (response: Response) => void;
    fetch.mockImplementation((url, init) => {
      const payload = JSON.parse(init.body as string);
      return payload.event_type === 'element_clicked' ? new Promise<Response>(resolve => { finishLog = resolve; }) : original(url, init);
    });
    (harness.routeNativeElement!.querySelector('.site-nav a[href="/about-me"]') as HTMLAnchorElement).click();
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    const events = fetch.mock.calls.slice(1).map(call => JSON.parse(call[1].body as string));
    expect(events).toHaveLength(2);
    const click = events.find(event => event.event_type === 'element_clicked');
    const content = events.find(event => event.get_project === 'About Me');
    expect(click).toMatchObject({ target: 'About Me', action: 'nav', get_project: '' });
    expect(content).toMatchObject({ action: '', target: '', event_type: 'page_view' });
    expect(click.session).toBe(content.session);
    expect(click.event_id).not.toBe(content.event_id);
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('About Me');
    finishLog({ ok: true, json: async () => ({}) } as Response);
  });

  it('captures route clicks once across reused routes and removes listeners on destruction', async () => {
    const fetch = await configureApi();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    const oldAboutLink = harness.routeNativeElement!.querySelector('.site-nav a[href="/about-me"]') as HTMLAnchorElement;
    // Model target-side handling that prevents the old component's host bubble listener.
    oldAboutLink.addEventListener('click', event => event.stopPropagation());
    oldAboutLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/about-me');
    const labLink = harness.routeNativeElement!.querySelector('.site-nav a[href="/projects"]') as HTMLAnchorElement;
    labLink.addEventListener('click', event => event.stopPropagation());
    labLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/projects');
    const events = fetch.mock.calls.slice(1).map(call => JSON.parse(call[1].body as string));
    expect(events.map(event => event.event_type)).toEqual(['element_clicked', 'page_view', 'element_clicked', 'project_open']);
    expect(events[0]).toMatchObject({ target: 'About Me', page_path: '/projects', metadata: { element_id: 'about-menu' } });
    expect(events[2]).toMatchObject({ target: 'Projects', page_path: '/about-me', metadata: { element_id: 'projects-menu' } });
    expect(new Set(events.map(event => event.session)).size).toBe(1);
    expect(new Set(events.map(event => event.event_id)).size).toBe(4);
    const count = fetch.mock.calls.length;
    harness.fixture.destroy();
    // Detached nodes from a destroyed viewer must no longer own analytics listeners.
    oldAboutLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledTimes(count);
  });

  it('keeps the visible document through failed navigation and sends the exact failed payload on retry', async () => {
    const fetch = await configureApi();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/projects/visual-agent-builder', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    page.frameLoaded(page.state().documentId!);
    harness.detectChanges();
    const oldFrame = harness.routeNativeElement!.querySelector('iframe')!;
    const oldDocument = oldFrame.getAttribute('srcdoc');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    await harness.navigateByUrl('/projects/aws-observability', PortfolioPage);
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('iframe')!.getAttribute('srcdoc')).toBe(oldDocument);
    expect(harness.routeNativeElement!.querySelector('iframe')).toBe(oldFrame);
    expect(harness.routeNativeElement!.textContent).toContain('This page couldn’t be loaded.');
    const failedBody = fetch.mock.calls[1][1].body;
    (harness.routeNativeElement!.querySelector('button') as HTMLButtonElement).click();
    await new Promise(resolve => setTimeout(resolve, 0));
    harness.detectChanges();
    const retry = fetch.mock.calls.find((call, index) => index > 1 && JSON.parse(call[1].body as string).get_project === 'OpenTelemetry implementation lab');
    expect(retry?.[1].body).toBe(failedBody);
    page.frameLoaded(page.state().documentId!);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toBe('OpenTelemetry implementation lab');
    expect(harness.routeNativeElement!.querySelector('iframe')).not.toBe(oldFrame);
    expect(oldFrame.isConnected).toBe(false);
  });
});
