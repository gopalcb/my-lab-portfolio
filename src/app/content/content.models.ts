export type ContentKind = 'projects' | 'read';

/** Contract shared by the local catalog and a future GET /projects or /read API. */
export interface ContentItem {
  id: string;
  title: string;
  summary: string;
  htmlUrl: string;
  /** Optional editorial group for the sidebar; older API catalogs may omit it. */
  topic?: string;
}

export interface ContentSettings {
  /** null uses the local object arrays; otherwise GET {base}/projects and {base}/read. */
  catalogApiBaseUrl: string | null;
  /** Exact HTTPS origins permitted to host HTML, e.g. an approved CloudFront origin. */
  contentOrigins: readonly string[];
}
