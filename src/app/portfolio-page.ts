import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, SafeHtml } from '@angular/platform-browser';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { ContentItem, ContentKind } from './content/content.models';
import { ContentService } from './content/content.service';
import { HIDDEN_PROJECT_IDS } from './content/content.catalog';

type PageKind = ContentKind | 'about' | 'missing';
interface PageState {
  kind: PageKind;
  phase: 'loading-list' | 'loading-content' | 'ready' | 'catalog-error' | 'content-error' | 'empty' | 'not-found';
  items: ContentItem[];
  selected?: ContentItem;
  document?: SafeHtml;
}

@Component({
  selector: 'app-portfolio-page',
  imports: [RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class PortfolioPage {
  private readonly service = inject(ContentService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly retries = new Subject<void>();

  readonly state = toSignal(combineLatest([
    this.route.paramMap,
    this.route.data,
    this.retries.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([params, data]) => {
      const kind = data['kind'] as PageKind;
      const id = params.get('id');
      if (kind === 'about' || kind === 'missing') {
        this.title.setTitle(kind === 'about' ? 'About me · My work portfolio' : 'Page not found · My work portfolio');
        return of<PageState>({ kind, phase: kind === 'about' ? 'ready' : 'not-found', items: [] });
      }
      return this.service.list(kind).pipe(
        switchMap(items => {
          if (!items.length) return of<PageState>({ kind, items, phase: 'empty' });
          const selected = id ? items.find(item => item.id === id) : items[0];
          if (!selected) return of<PageState>({ kind, items, phase: 'not-found' });
          this.title.setTitle(`${selected.title} · My work portfolio`);
          return this.service.load(selected).pipe(
            map(document => ({ kind, items, selected, document, phase: 'ready' }) as PageState),
            catchError(() => of<PageState>({ kind, items, selected, phase: 'content-error' })),
            startWith<PageState>({ kind, items, selected, phase: 'loading-content' }),
          );
        }),
        catchError(() => of<PageState>({ kind, items: [], phase: 'catalog-error' })),
        startWith<PageState>({ kind, items: [], phase: 'loading-list' }),
      );
    }),
  ), { initialValue: { kind: 'projects', phase: 'loading-list', items: [] } as PageState });

  readonly visibleItems = computed(() => this.state().kind === 'projects'
    ? this.state().items.filter(item => !HIDDEN_PROJECT_IDS.has(item.id))
    : this.state().items);

  retry(): void { this.retries.next(); }
}
