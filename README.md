# My work portfolio

Angular portfolio with a shared sidebar and an isolated HTML document viewer.
The typed catalog in `src/app/content/content.catalog.ts` defines titles and routes.
Project pages and About Me load through a public CloudFront POST endpoint; their
HTML is stored in private S3. CSS, diagrams, video and the nine Dev notes remain
in this frontend repository.

```bash
npm ci
npm start -- --host 127.0.0.1 --port 4200
npm test -- --watch=false
npm run build
```

Preview: http://127.0.0.1:4200/. Hash routes preserve direct links and refresh on
static hosting. `/projects` opens Runtime Controller; `/projects/:id` selects a
project, `/read/:id` selects a Dev note, and `/about-me` loads About Me. Legacy
`/my-works`, `/read/linux-essentials` and the old observability route redirect to
their current routes.

## Content API and analytics

`CONTENT_SETTINGS.endpoint` is the single absolute API URL:
`https://d10qhbfu5fjd8s.cloudfront.net/gb-portfolio/get-content`.
No AWS credentials or origin secret belong in frontend code.

All operations use JSON POST. A content request supplies the exact catalog title
in `get_project`; the response contains `html`, `project` and `content_type`.
A logging-only request leaves `get_project` empty and returns `{}`. Click events
use `action: "nav"`, a descriptive `target`, and `event_type: "element_clicked"`.
Project opens use `project_open`; About Me and local reading views use `page_view`.
Content events also count as page views, without an additional duplicate event.
The root route opens a project immediately, so it sends that project-open request.

Every event carries a random event UUID and an anonymous, tab-scoped session UUID.
Sessions use `sessionStorage`, rotate after 30 minutes inactivity, and fall back
to tab-lifetime memory when storage is unavailable. They do not identify a person.
Retries preserve the complete original payload and event ID. Click logging starts
before route activation and does not block content or external navigation.
External links use best-effort keepalive requests; browser shutdown delivery is
not guaranteed. Native video play, pause and ended events are distinct from clicks,
and resume produces a new play event. A visible Play/Pause button records its actual
click separately. Browser-owned seek/volume/fullscreen controls do not expose DOM
clicks; playback changes from native controls still produce video events.
Continuous playback positions are not logged.

The frontend sends bounded page paths without query strings, titles, language,
browser timezone, viewport width and referrer hostname. It does not send precise
location, cookies or credentials. Backend analytics use 90-day TTL, approximate
CloudFront geolocation when available, and no raw IP storage. CORS permits the
production origin and `http://127.0.0.1:4200` / `http://localhost:4200` for ongoing
local preview. CORS is not visitor authentication; the content endpoint is public.

## HTML isolation and loading

Project/About HTML is validated before rendering. Empty logging responses cannot
become documents. Route changes cancel obsolete rendering; loading and retryable
errors preserve the previous successful document. Network requests have a
15-second timeout and one automatic retry for transient failures. A retry button
reuses the original content payload.

Full documents render in an opaque `srcdoc` iframe. The static sandbox permits
scripts and user-opened tabs, but never same-origin access, forms or top navigation.
Fetched scripts, handlers, embedded frames and supplied base/meta tags are removed.
A generated nonce permits only the frontend-owned tracking bridge; a restrictive
CSP blocks network APIs, arbitrary scripts and objects. The parent validates the
sending frame, opaque origin, document identity and event fields before logging.

Assets resolve against the frontend URL, never the private S3 or API URL. The
media policy permits only the bundled Runtime Controller MP4. Source links can
open separate tabs. Section anchors remain within the document. Articles remain
light-only, with reduced-motion-aware route transitions and responsive diagrams.

## Editing content

Seven project HTML sources and About Me are maintained outside this Git repository,
in the sibling `gb-portfolio-aws/content/` directory, and deployed to private S3.
The AWS stack, Lambda, Python tests, staging tools, deployment outputs, secrets and
implementation plan remain in that external project. See its `ARCHITECTURE.md`
and implementation record for deployment, retention, rollback and live evidence.
Existing article verification scripts moved there with the content they validate.

To change a project, update its external HTML and deploy the content upload from
the external CDK project. Keep CSS, SVGs, editable Mermaid sources and video under
`public/projects/`. New titles require matching frontend catalog and backend key
mapping entries. Do not restore project HTML under `public/` as a fallback.
Dev notes continue to live in `public/read/`; these use the same isolated viewer
and send a page-view event while fetching their frontend-owned HTML.

Runtime Controller is at `/#/projects/visual-agent-builder`. Its demo is
`public/projects/assets/visual-agent-builder/runtime-controller-demo.mp4`; the
architecture diagram has adjacent `.mmd` and SVG files. Preserve source-grounded
claims and label illustrative or proposed behavior in technical articles.

The main menu shows Runtime Controller, Do More Agents Mean Better Work?,
OpenTelemetry implementation lab and Customizing agents and runtime. `HIDDEN_PROJECT_IDS` temporarily hides the other
three project titles; their direct routes remain available. Dev notes retain
`/read` routes although their main-menu entry is currently hidden.

## Publication

Source: https://github.com/gopalcb/my-lab-portfolio

Public site: https://gopalcb.github.io/

Source CI runs frontend tests and the production build. Publication uses the
existing user-site workflow with an explicitly verified source commit:

```bash
gh workflow run publish-angular-portfolio.yml --repo gopalcb/gopalcb.github.io --ref master -f source_ref=<full-source-commit-sha>
```

Only frontend changes belong in this repository. Infrastructure is deployed
locally from the external project. Local screenshots, task records and private
runtime state are excluded. Builds and unit tests alone do not prove live AWS,
native browser or deployed-site behavior; report each separately.
