# Agents and runtime diagrams

These Mermaid diagrams describe the request, planning, tool, and validation
flows for the customized agents and runtime project. They use compact
left-to-right layouts so the diagrams support the article without taking over
the page. Each diagram is committed as light and dark SVG artifacts so the
sandboxed article remains script-free.

memory-flow.mmd adds the proposed read/write memory integration. It is not a
deployed capability. Its light/dark SVGs use the 13px configurations under
../observability/blueprint/ and Mermaid CLI 12.0.0. From this directory:

```sh
for theme in light dark; do
  mmdc -i memory-flow.mmd -o "memory-flow-$theme.svg" -c "../observability/blueprint/$theme-config.json" -p ../observability/blueprint/puppeteer-config.json -b transparent --size 2400
done
```

The memory diagram displays at its viewBox width (503.42px) to preserve label
size; update agents-runtime.css if regeneration changes that width.
