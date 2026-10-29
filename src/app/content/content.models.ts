export type ContentKind = 'projects' | 'read';

/** Local route catalog. Project documents are delivered only through the POST API. */
export interface ContentItem {
  id: string;
  title: string;
  summary: string;
  htmlUrl: string;
  /** Optional editorial group for the sidebar; older API catalogs may omit it. */
  topic?: string;
}

export interface ContentSettings {
  /** Absolute CloudFront POST endpoint; configured after infrastructure deployment. */
  endpoint: string;
}
