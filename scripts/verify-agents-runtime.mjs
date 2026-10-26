import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const article = await readFile(new URL('public/projects/agents-and-runtime.html', root), 'utf8');
for (const removed of ['tab-panel', 'article-tabs', 'doc-card', 'tool-card', 'type="radio"', '<table', '<script']) {
  assert.ok(!article.includes(removed), 'Continuous article must not contain ' + removed);
}
assert.equal((article.match(/<figure /g) ?? []).length, 5);
for (const diagram of ['intake-flow', 'execution-flow', 'tools-flow', 'validation-flow', 'memory-flow']) {
  for (const theme of ['light', 'dark']) {
    const path = 'assets/agents-runtime/' + diagram + '-' + theme + '.svg';
    assert.ok(article.includes(path), 'Missing diagram: ' + path);
    assert.ok((await readFile(new URL('public/projects/' + path, root), 'utf8')).includes('<svg'));
  }
}
for (const topic of ['Working and session', 'Episodic memory', 'Semantic or factual', 'Procedural memory', 'Preference memory', 'boto3.Session', 'AWSV4SignerAuth', 'knn_vector', 'source_revision', 'expires_at', 'Proposed integration; not deployed']) {
  assert.ok(article.includes(topic), 'Missing memory contract: ' + topic);
}
assert.equal((article.match(/data-language="python"/g) ?? []).length, 6);
const ids = [...article.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must remain unique');
for (const link of article.matchAll(/href="(assets\/[^"]+)"/g)) {
  await readFile(new URL('public/projects/' + link[1], root));
}
console.log('Agents article: no tabs/cards, five diagrams, source links and six Python examples verified.');
