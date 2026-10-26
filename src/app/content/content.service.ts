import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, defer, map, of, timeout } from 'rxjs';
import { CONTENT_SETTINGS, LOCAL_CATALOG } from './content.catalog';
import { ContentItem, ContentKind, ContentSettings } from './content.models';

export const CONTENT_CONFIG = new InjectionToken<ContentSettings>('CONTENT_CONFIG', {
  providedIn: 'root', factory: () => CONTENT_SETTINGS,
});

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CONTENT_CONFIG);
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  list(kind: ContentKind): Observable<ContentItem[]> {
    return defer(() => {
      const base = this.config.catalogApiBaseUrl;
      const source = base === null
        ? of<unknown>(LOCAL_CATALOG[kind])
        : this.http.get<unknown>(`${base.replace(/\/$/, '')}/${kind}`);
      return source.pipe(timeout(15_000), map(value => this.validateCatalog(value)));
    });
  }

  load(item: ContentItem): Observable<SafeHtml> {
    return defer(() => {
      const url = this.resolveHtmlUrl(item.htmlUrl);
      return this.http.get(url.href, { responseType: 'text', observe: 'response' }).pipe(
        timeout(15_000),
        map(response => {
          if (response.url) this.resolveHtmlUrl(response.url);
          const html = response.body ?? '';
          // Catch static-host SPA fallbacks, blank objects and unexpected response formats.
          if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html) || !/<h1[\s>]/i.test(html) || /<app-root[\s>]/i.test(html)) {
            throw new Error('The content URL did not return a standalone HTML document.');
          }
          return this.isolateDocument(html, url);
        }),
      );
    });
  }

  private validateCatalog(value: unknown): ContentItem[] {
    if (!Array.isArray(value)) throw new Error('The catalog must be an array.');
    const ids = new Set<string>();
    return value.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error('Invalid catalog item.');
      const item = entry as Record<string, unknown>;
      for (const field of ['id', 'title', 'summary', 'htmlUrl']) {
        if (typeof item[field] !== 'string' || !(item[field] as string).trim()) throw new Error(`Missing catalog field: ${field}.`);
      }
      const result: ContentItem = { id: item['id'] as string, title: item['title'] as string, summary: item['summary'] as string, htmlUrl: item['htmlUrl'] as string };
      if (item['topic'] !== undefined) {
        if (typeof item['topic'] !== 'string' || !item['topic'].trim()) throw new Error('Invalid catalog topic.');
        result.topic = item['topic'].trim();
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.id) || ids.has(result.id)) throw new Error('Invalid or duplicate catalog ID.');
      ids.add(result.id);
      this.resolveHtmlUrl(result.htmlUrl);
      return result;
    });
  }

  private resolveHtmlUrl(value: string): URL {
    const url = new URL(value, this.document.baseURI);
    const appOrigin = new URL(this.document.baseURI).origin;
    const local = url.origin === appOrigin && ['http:', 'https:'].includes(url.protocol);
    const remote = url.protocol === 'https:' && this.config.contentOrigins.includes(url.origin);
    if ((!local && !remote) || url.username || url.password || !url.pathname.endsWith('.html')) {
      throw new Error('The content URL is not an approved HTML location.');
    }
    return url;
  }

  private isolateDocument(html: string, url: URL): SafeHtml {
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    // SECURITY: SafeHtml is used ONLY as srcdoc on a statically sandboxed iframe.
    // No allow-scripts or allow-same-origin. Content never enters the parent DOM.
    // User-clicked source links may open separate tabs; parent navigation stays blocked.
    // The first CSP/base precede fetched markup; subsequent policies cannot relax it.
    const origins = [...new Set([url.origin, new URL(this.document.baseURI).origin])].join(' ');
    const policy = `default-src 'none'; script-src 'none'; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; img-src data: ${origins}; style-src 'unsafe-inline' ${origins}; font-src 'none'; base-uri ${url.origin}`;
    const lightStylesUrl = new URL('read/light.css', this.document.baseURI).href;
    const readerStyles = `<link rel="stylesheet" href="${escape(lightStylesUrl)}">`;
    const head = `<head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"><base href="${escape(url.href)}"><meta name="viewport" content="width=device-width, initial-scale=1">${readerStyles}`;
    // A complete guard document precedes all fetched bytes, including comments.
    // The HTML parser folds the fetched document into this body; its styles remain
    // inside the frame. Avoid regex insertion into an untrusted <head> token.
    // An asset base would otherwise turn #section links into a new HTTP document.
    // Keep editorial anchor links inside the srcdoc browsing context.
    const anchored = html.replace(/(<a\b[^>]*\bhref\s*=\s*)(["'])#([^"']*)\2/gi, '$1$2about:srcdoc#$3$2');
    const isolated = `<!doctype html><html lang="en" data-portfolio-theme="light">${head}</head><body>${anchored}</body></html>`;
    return this.sanitizer.bypassSecurityTrustHtml(isolated);
  }
}
