# Runtime Controller flow

`request-to-result.mmd` is the editable Mermaid source. `request-to-result.svg`
is its pre-rendered light SVG with native SVG text, no scripts or foreignObject.
The diagram follows backend/runtime.ts, backend/store.ts, backend/routing.ts and
frontend/src/app.ts in the sibling visual-agent-builder checkout. Side branches
separate saved controller state from direct Codex edits to application files.

Regenerate from the portfolio root:

```bash
node scripts/render-runtime-controller.cjs
```

The script reuses the already installed Playwright package and frontend Mermaid
bundle in ../visual-agent-builder. It starts a disposable headless browser and
closes it in finally. No package install, external service or runtime Mermaid
script is required by the portfolio. Keep the generated SVG alongside the source;
inspect desktop/mobile rendering after changes. The horizontally scrollable
figure preserves label size on small screens; the surrounding article explains
the same flow in text.
