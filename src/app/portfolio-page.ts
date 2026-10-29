import { Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, SafeHtml } from '@angular/platform-browser';
import { Subject, catchError, combineLatest, distinctUntilChanged, map, of, scan, startWith, switchMap, tap } from 'rxjs';
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
  @ViewChild('contentFrame') private frame?: ElementRef<HTMLIFrameElement>;

  readonly state = toSignal(combineLatest([
    this.route.paramMap, this.route.data, this.retries.pipe(startWith(0)),
  ]).pipe(
    map(([params, data, retry]) => ({ kind: data['kind'] as PageKind, id: params.get('id'), retry })),
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
      if (state.phase === 'ready' && state.document && state.documentId) this.service.displayed = {
        document: state.document, documentId: state.documentId, documentTitle: state.documentTitle!, documentPath: state.documentPath!,
      };
      else if (['not-found', 'empty'].includes(state.phase)) this.service.displayed = undefined;
    }),
  ), { initialValue: { ...INITIAL, ...this.service.displayed } });

  // A successful document owns a fresh browsing context; loading/retry retains the old one.
  readonly frameViews = computed(() => {
    const state = this.state();
    return state.document ? [{ id: state.documentId, html: state.document, title: state.documentTitle }] : [];
  });

  readonly visibleItems = computed(() => this.state().kind === 'projects'
    ? this.state().items.filter(item => !HIDDEN_PROJECT_IDS.has(item.id)) : this.state().items);

  retry(): void { this.retries.next(++this.retryCount); }

  constructor() {
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
    const state = this.state();
    const message = validateBridgeMessage(event, this.frame?.nativeElement.contentWindow ?? null, state.documentId ?? '');
    if (!message) return;
    const context = { path: state.documentPath ?? this.router.url, title: state.documentTitle ?? '' };
    if (message.type === 'element_clicked') {
      this.api.log(this.api.payload('element_clicked', context, { element_id: message.elementId }, message.title), message.external);
    } else {
      this.api.log(this.api.payload(message.type, context, {
        video_id: message.videoId, video_title: message.title, current_time_seconds: message.currentTime, muted: message.muted,
      }));
    }
  }
}
