# Source-aligned Mermaid assets

The four .mmd files are the Mermaid blocks, in order, from
OTel_EKS_Observability_Portfolio_Package/docs/PROJECT_DOCUMENTATION.md.
The published documentation is an unchanged downloadable copy.

SVGs were generated with Mermaid CLI 12.0.0 and the adjacent light/dark
configuration files. From this directory, with mmdc available:

```sh
for theme in light dark; do
  for diagram in deployment-topology request-sequence collector-pipelines failure-investigation; do
    mmdc -i "$diagram.mmd" -o "$diagram-$theme.svg" -c "$theme-config.json" -p puppeteer-config.json -b transparent --size 2400
  done
done
```

puppeteer-config.json points to Chrome on macOS; adjust executablePath for
another development environment. No browser-side Mermaid scripts are needed.
The article renders at each SVG's viewBox width to retain 12px text.
If regeneration changes those widths, update observability.css accordingly.

Run `node scripts/verify-observability.mjs` from the project root to check
source fidelity, the two-tab structure and all eight rendered theme assets.

The October 2026 typography update subtracts 1px from every SVG font-size
declaration while preserving viewBox geometry and diagram content. Configurations
now use 12px primary labels. The inline Elasticsearch chart also uses 12px.
