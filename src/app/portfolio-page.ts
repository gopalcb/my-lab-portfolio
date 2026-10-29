import { Component, DestroyRef, ElementRef, HostListener, QueryList, ViewChildren, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Title, SafeHtml } from '@angular/platform-browser';
import { Subject, catchError, combineLatest, distinctUntilChanged, filter, map, of, scan, startWith, switchMap, tap } from 'rxjs';
import { ContentItem, ContentKind } from './content/content.models';
import { ABOUT_ITEM, ContentService } from './content/content.service';
import { HIDDEN_PROJECT_IDS } from './content/content.catalog';
import { PortfolioApi } from './content/portfolio-api.service';
import { validateBridgeMessage } from './content/tracking-bridge';

type PageKind = ContentKind | 'about' | 'missing';
interface PageState {
  kind: PageKind;
  phase: 'loading-list' | 'loading-content' | 'ready' | 'catalog-error' | 'content-error' | 'empty' | 'not-found';
  items: ContentItem[];
  selected?: ContentItem;
  document?: SafeHtml;
  documentId?: string;
  documentTitle?: string;
  documentPath?: string;
}
const INITIAL: PageState = { kind: 'projects', phase: 'loading-list', items: [] };

@Component({ selector: 'app-portfolio-page', imports: [RouterLink], templateUrl: './app.html', styleUrl: './app.css' })
export class PortfolioPage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(ContentService);
  private readonly api = inject(PortfolioApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly retries = new Subject<number>();
  private retryCount = 0;
  @ViewChildren('contentFrame') private frames?: QueryList<ElementRef<HTMLIFrameElement>>;
  readonly displayed = signal(this.service.displayed);
  readonly renderFailed = signal<string | undefined>(undefined);

  readonly state = toSignal(combineLatest([
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), startWith(null),
      map(() => this.route.snapshot)), this.retries.pipe(startWith(0)),
  ]).pipe(
    map(([route, retry]) => ({ kind: route.data['kind'] as PageKind, id: route.paramMap.get('id'), retry })),
    distinctUntilChanged((a, b) => a.kind === b.kind && a.id === b.id && a.retry === b.retry),
    scan((previous, current) => ({ ...current, isRetry: previous.kind === current.kind && previous.id === current.id && previous.retry !== current.retry }),
      { kind: '' as PageKind, id: null as string | null, retry: 0, isRetry: false }),
    switchMap(({ kind, id, isRetry }) => {
      if (kind === 'missing') {
        this.title.setTitle('Page not found · My work portfolio');
        if (!isRetry) this.api.log(this.api.payload('page_view', { path: this.router.url, title: 'Page not found' }));
        return of<PageState>({ kind, phase: 'not-found', items: [] });
      }
      const catalog = kind === 'about' ? of([ABOUT_ITEM]) : this.service.list(kind);
      return catalog.pipe(
        switchMap(items => {
          if (!items.length) {
            this.title.setTitle('Nothing published yet · My work portfolio');
            if (!isRetry) this.api.log(this.api.payload('page_view', { path: this.router.url, title: 'Nothing published yet' }));
            return of<PageState>({ kind, items, phase: 'empty' });
          }
          const selected = id ? items.find(item => item.id === id) : items[0];
          if (!selected) {
            this.title.setTitle('Page not found · My work portfolio');
            if (!isRetry) this.api.log(this.api.payload('page_view', { path: this.router.url, title: 'Page not found' }));
            return of<PageState>({ kind, items, phase: 'not-found' });
          }
          this.title.setTitle(`${selected.title} · My work portfolio`);
          const documentId = crypto.randomUUID();
          const documentPath = this.router.url;
          return this.service.load(selected, isRetry, documentId, documentPath).pipe(
            map(document => ({ kind, items, selected, document, documentId, documentPath, documentTitle: selected.title, phase: 'ready' }) as PageState),
            catchError(() => of<PageState>({ kind, items, selected, phase: 'content-error' })),
            startWith<PageState>({ kind, items, selected, phase: 'loading-content' }),
          );
        }),
        catchError(() => of<PageState>({ kind, items: [], phase: 'catalog-error' })),
        startWith<PageState>({ kind, items: [], phase: 'loading-list' }),
      );
    }),
    scan((previous: PageState, current: PageState) => ['loading-list', 'loading-content', 'content-error', 'catalog-error'].includes(current.phase)
      ? { ...current, document: previous.document, documentId: previous.documentId, documentPath: previous.documentPath, documentTitle: previous.documentTitle }
      : current, { ...INITIAL, ...this.service.displayed }),
    tap(state => {
      if (['not-found', 'empty'].includes(state.phase)) {
        this.service.displayed = undefined;
        this.displayed.set(undefined);
      }
    }),
  ), { initialValue: { ...INITIAL, ...this.service.displayed } });

  // Keep the visible browsing context until the incoming document's resources settle.
  readonly frameViews = computed(() => {
    const state = this.state();
    const visible = this.displayed();
    const views = visible ? [{ id: visible.documentId, html: visible.document, title: visible.documentTitle, pending: false }] : [];
    if (state.phase === 'ready' && state.document && state.documentId !== visible?.documentId && state.documentId !== this.renderFailed()) {
      views.push({ id: state.documentId!, html: state.document, title: state.documentTitle!, pending: true });
    }
    return views;
  });
  readonly loading = computed(() => ['loading-list', 'loading-content'].includes(this.state().phase)
    || (this.state().phase === 'ready' && this.state().documentId !== this.displayed()?.documentId && !this.renderFailed()));

  frameLoaded(id: string): void {
    const state = this.state();
    if (state.phase !== 'ready' || state.documentId !== id || this.renderFailed() === id || !state.document) return;
    const visible = { document: state.document, documentId: id, documentTitle: state.documentTitle!, documentPath: state.documentPath! };
    this.service.displayed = visible;
    this.displayed.set(visible);
  }

  readonly visibleItems = computed(() => this.state().kind === 'projects'
    ? this.state().items.filter(item => !HIDDEN_PROJECT_IDS.has(item.id)) : this.state().items);

  retry(): void { this.retries.next(++this.retryCount); }

  constructor() {
    effect(onCleanup => {
      const state = this.state();
      const visible = this.displayed();
      this.renderFailed.set(undefined);
      if (state.phase !== 'ready' || state.documentId === visible?.documentId) return;
      const timeout = setTimeout(() => this.renderFailed.set(state.documentId), 20_000);
      onCleanup(() => clearTimeout(timeout));
    });
    // RouterLink can destroy this component before the click reaches a bubbling listener.
    const captureClick = (event: MouseEvent) => this.trackClick(event);
    this.host.nativeElement.addEventListener('click', captureClick, true);
    this.destroyRef.onDestroy(() => this.host.nativeElement.removeEventListener('click', captureClick, true));
  }

  trackClick(event: MouseEvent): void {
    const element = event.target instanceof Element ? event.target.closest('a,button,input,select,textarea,summary,label,[role="button"]') : null;
    if (!element || !this.host.nativeElement.contains(element)) return;
    const title = (element.getAttribute('data-track-title') || element.getAttribute('aria-label') || element.textContent || 'Control').trim().replace(/\s+/g, ' ').slice(0, 200);
    const id = (element.getAttribute('data-track-id') || element.id || element.getAttribute('href') || title).slice(0, 128);
    const external = element instanceof HTMLAnchorElement && element.origin !== location.origin;
    this.api.log(this.api.payload('element_clicked', { path: this.router.url, title: this.title.getTitle() }, { element_id: id }, title), external);
  }

  @HostListener('window:message', ['$event'])
  trackFrame(event: MessageEvent): void {
    const state = this.displayed();
    const frame = this.frames?.find(ref => ref.nativeElement.contentWindow === event.source);
    const id = frame?.nativeElement.dataset['documentId'] ?? '';
    const message = validateBridgeMessage(event, frame?.nativeElement.contentWindow ?? null, id);
    if (!message) return;
    if (message.type === 'document_ready') { this.frameLoaded(id); return; }
    if (id !== state?.documentId) return;
    const context = { path: state?.documentPath ?? this.router.url, title: state?.documentTitle ?? '' };
    if (message.type === 'element_clicked') {
      this.api.log(this.api.payload('element_clicked', context, { element_id: message.elementId }, message.title), message.external);
    } else {
      this.api.log(this.api.payload(message.type, context, {
        video_id: message.videoId, video_title: message.title, current_time_seconds: message.currentTime, muted: message.muted,
      }));
    }
  }
}
