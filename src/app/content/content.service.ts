import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, map, of, timeout } from 'rxjs';
import { LOCAL_CATALOG } from './content.catalog';
import { ContentItem, ContentKind } from './content.models';
import { PortfolioApi, PortfolioPayload } from './portfolio-api.service';
import { trackingBridge } from './tracking-bridge';

export const ABOUT_ITEM: ContentItem = { id: 'about-me', title: 'About Me', summary: 'Gopal C Bala · gopalcb · he/him', htmlUrl: 'about-me.html' };

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(PortfolioApi);
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  displayed?: { document: SafeHtml; documentId: string; documentTitle: string; documentPath: string };
  private lastRequest?: { id: string; payload: PortfolioPayload };

  list(kind: ContentKind): Observable<ContentItem[]> { return of([...LOCAL_CATALOG[kind]]); }

  load(item: ContentItem, retry = false, documentId: string = crypto.randomUUID(), path = '/'): Observable<SafeHtml> {
    const url = new URL(item.htmlUrl, this.document.baseURI);
    const isLocalRead = url.pathname.includes('/read/');
    const payload = retry && this.lastRequest?.id === item.id ? this.lastRequest.payload : this.api.payload(
      isLocalRead || item.id === 'about-me' ? 'page_view' : 'project_open',
      { path, title: item.title }, {}, '', isLocalRead ? '' : item.title,
    );
    this.lastRequest = { id: item.id, payload };
    if (isLocalRead) {
      this.api.log(payload);
      return this.http.get(url.href, { responseType: 'text' }).pipe(timeout(15_000), map(html => this.isolateDocument(html, url, documentId)));
    }
    return new Observable(subscriber => {
      const controller = new AbortController();
      void this.api.post(payload, controller.signal).then(value => {
        if (subscriber.closed) return;
        const response = value as { html?: unknown; project?: unknown; content_type?: unknown } | null;
        if (!response || typeof response.html !== 'string' || response.project !== item.title || typeof response.content_type !== 'string' || !/^text\/html(?:;\s*charset=utf-8)?$/i.test(response.content_type)) {
          throw new Error('The API did not return the requested HTML document.');
        }
        subscriber.next(this.isolateDocument(response.html, url, documentId));
        subscriber.complete();
      }).catch(error => { if (!subscriber.closed) subscriber.error(error); });
      return () => controller.abort();
    });
  }

  private isolateDocument(html: string, url: URL, documentId: string): SafeHtml {
    if (!/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html) || !/<h1[\s>]/i.test(html) || /<app-root[\s>]/i.test(html)) {
      throw new Error('The content response is not a standalone HTML document.');
    }
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    if (!parsed.querySelector('h1')?.textContent?.trim()) throw new Error('The document has no readable heading.');
    parsed.querySelectorAll('script,base,meta,iframe,object,embed,form').forEach(element => element.remove());
    parsed.querySelectorAll('*').forEach(element => {
      for (const attr of [...element.attributes]) {
        if (/^on/i.test(attr.name) || ['nonce', 'srcdoc', 'integrity'].includes(attr.name.toLowerCase())) element.removeAttribute(attr.name);
      }
      if (element instanceof HTMLAnchorElement) {
        const href = element.getAttribute('href') ?? '';
        if (href.startsWith('#')) element.setAttribute('href', `about:srcdoc${href}`);
        else if (/^\s*(javascript|data|vbscript):/i.test(href)) element.removeAttribute('href');
      }
    });
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const origin = new URL(this.document.baseURI).origin;
    const nonce = crypto.randomUUID();
    const demo = new URL('projects/assets/visual-agent-builder/runtime-controller-demo.mp4', this.document.baseURI).href;
    const policy = `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'none'; object-src 'none'; frame-src 'none'; media-src ${demo}; form-action 'none'; img-src data: ${origin}; style-src 'unsafe-inline' ${origin}; font-src 'none'; base-uri ${origin}`;
    const styles = new URL('read/light.css', this.document.baseURI).href;
    // SECURITY: only this generated script has the nonce. The iframe must never gain allow-same-origin.
    // The local route URL, rather than the API URL, remains the base for every asset.
    const isolated = `<!doctype html><html lang="en" data-portfolio-theme="light"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"><base href="${escape(url.href)}"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${escape(styles)}">${parsed.head.innerHTML}</head><body class="${escape(parsed.body.className)}">${parsed.body.innerHTML}<script nonce="${nonce}">${trackingBridge(documentId)}</script></body></html>`;
    return this.sanitizer.bypassSecurityTrustHtml(isolated);
  }
}
