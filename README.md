# My work portfolio

Angular portfolio with a shared sidebar and HTML document viewer for My works and
Dev notes. Metadata currently comes from typed JavaScript object arrays in
`src/app/content/content.catalog.ts`; selecting an item makes a real HTTP GET for
its standalone HTML document. There are no cloud requests in the default setup.

```bash
npm ci
npm start -- --host 127.0.0.1
npm test -- --watch=false
npm run build
```

Preview: http://127.0.0.1:4200/. Hash routes preserve direct links/refresh on a static
host. `/projects` and `/read` display the first published item without an extra
navigation; `/projects/:id` and
`/read/:id` select a specific item. The existing `#/my-works` entry redirects to
projects. The original `system-design` page is preserved as historical source;
ongoing catalog/UI development is in this Angular application.

## Theme

The portfolio uses a warm matte light palette throughout. There is no theme
switch or stored theme preference; older dark-mode preferences are ignored.
The shell uses light styles directly, and every isolated document loads
`public/read/light.css` for light tables and diagrams with matte dark code panels.

## Add a project or reading

1. Create a complete static HTML document with `html`, `head`, `body`, and `h1` in
   `public/projects` or `public/read`. Use embedded styles or relative local assets;
   scripts/framework templates do not run in the document viewer.
2. Add `{ id, title, summary, htmlUrl }` to the corresponding `LOCAL_CATALOG` array.
   Optional `topic` groups adjacent Dev notes; API catalogs may omit it. IDs are unique lowercase hyphenated slugs. URLs are relative to the app base,
   e.g. `read/implementation-and-delivery.html`.
3. Check desktop/mobile layout, diagram stacking and actual project
   status. A proposed architecture must not be presented as deployed evidence.

The current project documents were migrated from `system-design`, including both
local Glue Mermaid SVGs and their sources. Nine Dev notes use semantic HTML/CSS diagrams. The four EventHub notes cover architecture,
Kubernetes networking, implementation/delivery, debugging and Linux essentials.
The EKS lab is documentation-only and its runtime outcomes remain unverified. Two multi-agent notes describe the implemented local collaboration contract and proposed Bedrock bridge; three Codex workspace notes cover setup, tools/workflows/skills and memory/logging. My works now includes dedicated EKS and Codex multi-agent project pages.

## Connect an API and S3 later

`CONTENT_SETTINGS` is the only environment configuration required by the loader:

```ts
export const CONTENT_SETTINGS: ContentSettings = {
  catalogApiBaseUrl: 'https://api.example.com/content',
  contentOrigins: ['https://content.example.com'],
};
```

The example domains are placeholders, not configured services. The API contract is:

- `GET {catalogApiBaseUrl}/projects` → `ContentItem[]`
- `GET {catalogApiBaseUrl}/read` → `ContentItem[]`
- Each `htmlUrl` points to an approved HTTPS S3/CloudFront HTML document; it may also
  stay local. The same loader fetches HTML as text in either case.
- An empty array shows an empty state. Malformed/duplicate IDs, missing fields,
  unapproved URL origins and failed requests show a retryable error. A known item
  with unavailable HTML retains its title list so another item can be selected.
- No backend catalog implementation, bucket, distribution or deployment is created
  by this project. Configure the real endpoint and approved origin when available.

S3/CloudFront must serve `.html` as HTML and allow browser GET requests from the
portfolio's exact origin through CORS. The catalog API also needs suitable CORS.
Supporting document styles/images must be reachable from the sandboxed viewer;
embed them or serve same-origin public assets. Use HTTPS and relative asset paths.
Private content requires a separately designed authorization model; this client
does not store AWS credentials or generate signed URLs. Do not make private
buckets public just to satisfy the viewer.

## HTML isolation and lifecycle

`ContentService` validates catalog JSON at runtime and approves HTML URLs before
fetching. It rejects blank/non-document responses and static-host SPA fallbacks.
Route data and parameter changes use `switchMap` so stale requests are cancelled
without a duplicate fetch on NavigationEnd. Requests time out after 15 seconds. Retry re-fetches
the current catalog/document; catalogs do not silently fall back after API failure.

Fetched HTML is displayed in an opaque-origin iframe. The static sandbox omits
`allow-scripts`, `allow-same-origin`, form and top-navigation permissions. A CSP
inserted before fetched markup disables scripts, network APIs, nested frames and
objects; styles/images are restricted to the application/content origins, with
inline styles/data images allowed for diagrams. User-clicked source links may
open separate tabs (`allow-popups allow-popups-to-escape-sandbox`); authored links
use `noopener noreferrer`. A narrowly scoped Angular `SafeHtml` conversion is used
only for `iframe.srcdoc`, never `innerHTML` or application templates. Keep these
sandbox/CSP restrictions when changing the renderer.

Same-document contents links stay inside `about:srcdoc#section` instead of
refetching a document through the asset base. Documents scroll inside the right-hand viewer; they cannot modify the portfolio
shell or navigate its top window. This is for editorial static content, not an
arbitrary code execution or upload feature. Test sandbox behavior as well as URL
validation before enabling a new source. Source URL allowlisting is not a claim
that remote content or a future bucket is authenticated or safe.

Project manifest: `.codex/project.toml`. Shared UI task, requirements and evidence:
`../.codex/tools/ui-testing-and-debugging/docs/tasks/2026-10-18-angular-content-loader/`.

## Dev note diagrams and resource examples

The menu is Dev notes; `/read` routes remain stable for existing bookmarks.
The nine articles use semantic HTML/CSS figures directly inside their HTML.
`public/read/reading.css` defines neutral resource cards, muted connectors and one
mint accent. Ordered flows describe steps; parallel cards describe independent
paths. Three-column desktop flows stack on narrow screens, with arrows following
the reading order. There is no Mermaid runtime, image rendering step or CLI dependency
for Dev notes. Edit figure markup and CSS, then build normally. Existing project
page diagrams are independent and unchanged.

Keep examples consistent with
[`eks-microservices-lab/docs/implementation-resource-map.md`](../eks-microservices-lab/docs/implementation-resource-map.md).
It defines planned workloads, namespaces, selectors, container names, ports, queues,
outbox ownership and packet-path comparisons. Pod/node names, IPs, certificate domains
and generated controller resources must be discovered from the future implementation.
Do not invent deployed values or executed results. Articles contain no end reference lists. The Bedrock design includes contextual primary-source links opened in independent tabs; local file pointers and implementation documentation retain provenance.

Compact typography, statically highlighted code and the script-free iframe boundary
remain shared. Linux essentials are included in Build, delivery & Linux; the former
Linux route redirects there. Tables and long code remain internally scrollable;
diagrams adapt to the reading width.

Dev notes are grouped by optional catalog `topic`: EKS MICROSERVICES, MULTI-AGENT SYSTEMS and CODEX WORKSPACE. Older API catalogs without topics render under DEV NOTES. Model/configuration statements are a local snapshot; no credentials, native memory content or private runtime state are published.

The EKS My works page includes a detailed AWS-style HTML boundary map and foreground request/response walkthrough. Its project-only `public/projects/eks-architecture.css` layers on shared compact reading styles; it uses semantic HTML, not downloaded service icons or scripts. The implementation contract is documented in the EKS lab request-response-walkthrough.md.

## Runtime Controller project article

The first My works item is [Runtime Controller](public/projects/visual-agent-builder.html),
served at `/#/projects/visual-agent-builder`. Its source-reviewed walkthrough covers
visual capture, Codex dispatch, state, results, logging, usage and recovery in the
sibling `visual-agent-builder` project. `visual-agent-builder.css` adds only the
article-specific video player and Mermaid figure. Shared light reader styles
apply both in the portfolio and when the article is opened directly.

The demo uses a native HTML video player with controls, inline mobile playback and
metadata-only preload. `public/projects/assets/visual-agent-builder/runtime-controller-demo.mp4`
is a 720p H.264 web export of the supplied October 27 `runtime-agent-demo.mp4`
recording, replacing the previous demo. The original export stays local.
The reader CSP permits only this bundled media URL; scripts, nested frames,
network APIs and same-origin sandbox permissions remain disabled. To replace the
video, export a compatible MP4 at the same path and verify playback and seeking
inside the sandboxed article before publishing.

The Runtime Controller flow is authored in
`public/projects/assets/visual-agent-builder/request-to-result.mmd` and rendered
to a local SVG. See that asset directory’s README for regeneration. The portfolio
loads the image without a Mermaid runtime, external CDN or sandbox changes.

## Temporary navigation selection

The main navigation is **My lab** and **About me**; Dev notes is temporarily
hidden. The project menu shows Runtime Controller, OpenTelemetry implementation
lab, then Customizing agents and runtime. `HIDDEN_PROJECT_IDS` in the content
catalog hides Glue fuzzy matcher, EKS microservices and Codex multi-agent from
the menu. Their documents and direct routes, including Dev notes routes, remain
available for restoration. Social labels use the selected-project typography.

## Publication

Angular source: https://github.com/gopalcb/my-lab-portfolio

Public site: https://gopalcb.github.io/

The user-site repository retains its previous static files and history. Its
`publish-angular-portfolio.yml` Actions workflow checks out this public source
repository at the requested commit, runs tests/build and deploys the compiled
`dist/my-work-portfolio/browser` directory. Source CI verifies each push; publish
a verified revision explicitly with:

```bash
gh workflow run publish-angular-portfolio.yml --repo gopalcb/gopalcb.github.io --ref master -f source_ref=<full-source-commit-sha>
```

The site uses hash routes and base `/`, so reloads do not require server rewrites.
Workspace runtime state, screenshots, local task records and archives are excluded
from source control. Hidden navigation entries remain available at direct URLs.
