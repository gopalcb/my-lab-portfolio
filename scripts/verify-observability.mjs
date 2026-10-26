import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const article = await read('public/projects/aws-observability.html');
const documentation = await read('public/projects/assets/observability/blueprint/PROJECT_DOCUMENTATION.md');
const assetRoot = 'public/projects/assets/observability/blueprint/';
const diagrams = ['deployment-topology', 'request-sequence', 'collector-pipelines', 'failure-investigation'];
const definitions = [...documentation.matchAll(/```mermaid\n([\s\S]*?)```/g)].map(match => match[1].trim());
assert.equal(definitions.length, 4, 'Review changes to the source diagram inventory');
assert.equal((article.match(/type="radio"/g) ?? []).length, 2);
assert.equal((article.match(/class="mermaid-figure"/g) ?? []).length, 4);
assert.ok(!article.includes('<table'), 'Keep the article in prose rather than tables');
assert.ok(article.includes('id="overview-tab"') && article.includes('aria-controls="overview-panel" checked'));
const architecture = article.split('id="elastic-panel"')[0];
for (const [index, name] of diagrams.entries()) {
  assert.equal((await read(assetRoot + name + '.mmd')).trim(), definitions[index], name + ' must preserve source Mermaid');
  for (const theme of ['light', 'dark']) {
    const file = name + '-' + theme + '.svg';
    assert.ok(architecture.includes(file), file + ' must appear in the first panel');
    const svg = await read(assetRoot + file);
    assert.ok(svg.includes('<svg') && svg.includes('viewBox=') && svg.includes('12px'), file + ' must be rendered at readable type');
  }
}
// The published source documentation is also the portable verification input.
const elastic = article.split('id="elastic-panel"')[1];
assert.ok(elastic.includes('class="elastic-chart"'), 'Elasticsearch must include its trend chart');
assert.ok(elastic.includes('id="error-trend-title"') && elastic.includes('id="error-trend-description"'));
assert.ok(elastic.includes('Illustrative data, not live telemetry'));
for (const series of ['chart-profile', 'chart-user', 'chart-web']) {
  assert.ok(elastic.includes('chart-series ' + series), series + ' must be plotted');
}
for (const required of ['semantic_text', 'incident-embeddings', 'FIELD_EXTRACT', 'request-error-rate']) {
  // The request-rate example uses the source query's event name rather than its filename.
  assert.ok(article.includes(required === 'request-error-rate' ? 'http.request.completed' : required), required);
}
console.log('Observability article: two tabs, four source-faithful Mermaid diagrams, theme assets and search examples verified.');
