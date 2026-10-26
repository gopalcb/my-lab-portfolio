import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { appConfig } from './app.config';
import { PortfolioPage } from './portfolio-page';
import { ContentService } from './content/content.service';
import { LOCAL_CATALOG } from './content/content.catalog';
import { ContentItem, ContentKind } from './content/content.models';
import { SafeHtml } from '@angular/platform-browser';

const service = {
  list: (kind: ContentKind) => of([...LOCAL_CATALOG[kind]]),
  load: (item: ContentItem) => of(`<html><body><h1>${item.title}</h1></body></html>` as SafeHtml),
};

function configure(overrides: Partial<typeof service> = {}) {
  TestBed.configureTestingModule({ providers: [...appConfig.providers, { provide: ContentService, useValue: { ...service, ...overrides } }] });
}

describe('Portfolio route state', () => {
  it('shows the supplied profile and opens profile links in separate tabs', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/about-me', PortfolioPage);
    expect(harness.routeNativeElement!.querySelector('.message h1')?.textContent).toBe('Gopal C Bala');
    expect(harness.routeNativeElement!.querySelector('.message p')?.textContent).toBe('gopalcb · he/him');
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

  it('shows My lab with three projects and OpenTelemetry second', async () => {
    configure();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects', PortfolioPage);
    const links = [...harness.routeNativeElement!.querySelectorAll('.item-list a')];
    expect(links).toHaveLength(3);
    expect(links[0].textContent).toContain('Runtime Controller');
    expect(links[0].getAttribute('href')).toContain('/projects/visual-agent-builder');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('title')).toContain('Runtime Controller');
    expect(links[1].textContent).toContain('OpenTelemetry implementation lab');
    expect(links[1].getAttribute('href')).toContain('/projects/aws-observability');
    expect(links[2].textContent).toContain('Customizing agents and runtime');
    expect(harness.routeNativeElement!.querySelector('.site-nav')?.textContent).toContain('My lab');
    expect(harness.routeNativeElement!.querySelector('.site-nav a[href="#/read"]')).toBeNull();
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
    expect(harness.routeNativeElement!.querySelectorAll('.item-list a')).toHaveLength(3);
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('Customizing agents and runtime');
    await harness.navigateByUrl('/read/kubernetes-networking', PortfolioPage);
    expect(harness.routeNativeElement!.querySelectorAll('.item-list a')).toHaveLength(9);
    expect(harness.routeNativeElement!.querySelectorAll('.item-list [aria-current]')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('.item-list [aria-current]')?.textContent).toContain('Kubernetes networking');
    expect(harness.routeNativeElement!.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-popups allow-popups-to-escape-sandbox');
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
