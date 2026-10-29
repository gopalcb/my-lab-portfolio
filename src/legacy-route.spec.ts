import { describe, expect, it } from 'vitest';
import { legacyRouteUrl } from './legacy-route';

describe('legacy bookmarks', () => {
  it('keeps the route query and article anchor', () => {
    expect(legacyRouteUrl('https://site.test/#/projects/demo?view=full#goal')).toBe('/projects/demo?view=full#goal');
  });
  it('leaves clean URLs and ordinary fragments alone', () => {
    expect(legacyRouteUrl('https://site.test/projects/demo#goal')).toBeNull();
    expect(legacyRouteUrl('https://site.test/#content-area')).toBeNull();
  });
  it('never converts a network-path or backslash URL to an external destination', () => {
    expect(legacyRouteUrl('https://site.test/#//other.test/path')).toBeNull();
    expect(legacyRouteUrl('https://site.test/#/\\other.test/path')).toBeNull();
  });
});
