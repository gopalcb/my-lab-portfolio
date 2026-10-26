# Glue fuzzy matcher diagrams

Both .mmd files are exact copies of the Mermaid blocks in
`.codex/solutions-design-docs/fuzzy-matcher-aws-glue-etl-processor/solutions_design.md`
(R1, 2026-10-17): architecture from section 1, publication sequence from section 9.
They describe a provisional design, not a deployed application. The separate
MatchLake implementation is not the source for these diagrams.

SVGs are generated once with Mermaid CLI 12.0.0 and mermaid-config.json, then
served locally. No browser CDN, live Mermaid interpreter or third-party requests
are required. Mermaid CLI documentation: https://github.com/mermaid-js/mermaid-cli.

From the workspace root (requires Node/npm and installed Chrome), create a temporary
Puppeteer config JSON with executablePath pointing to your Chrome executable, then:

```bash
PUPPETEER_SKIP_DOWNLOAD=true npm exec --yes --package=@mermaid-js/mermaid-cli@12.0.0 -- mmdc -i system-design/assets/fuzzy-matcher/architecture.mmd -o system-design/assets/fuzzy-matcher/architecture.svg -c system-design/assets/fuzzy-matcher/mermaid-config.json -p /path/to/puppeteer.json -b transparent
PUPPETEER_SKIP_DOWNLOAD=true npm exec --yes --package=@mermaid-js/mermaid-cli@12.0.0 -- mmdc -i system-design/assets/fuzzy-matcher/publication.mmd -o system-design/assets/fuzzy-matcher/publication.svg -c system-design/assets/fuzzy-matcher/mermaid-config.json -p /path/to/puppeteer.json -b transparent
```

Regenerate after changing the authoritative design. Verify the copied blocks still
match before publishing. The page provides alternate text and keyboard-scrollable
panels to keep the wide diagrams readable on small screens.
