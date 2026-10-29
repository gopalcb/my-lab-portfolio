/** Convert bookmarked hash routes once, before the router can emit a page visit. */
export function legacyRouteUrl(href: string): string | null {
  const url = new URL(href);
  if (!url.hash.startsWith('#/') || url.hash.startsWith('#//')) return null;
  const target = new URL(url.hash.slice(1), url.origin);
  if (target.origin !== url.origin) return null;
  return target.pathname + target.search + target.hash;
}
