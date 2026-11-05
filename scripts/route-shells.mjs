// Pages has no server rewrites. Clean URLs hand off to the existing hash router.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const output = new URL('dist/my-work-portfolio/browser/', root);
const source = await readFile(new URL('src/app/content/content.catalog.ts', root), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { LOCAL_CATALOG } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const routes = ['projects', 'read', 'about-me', 'my-works', 'projects/aws-observability-redice', 'read/linux-essentials'];
for (const kind of ['projects', 'read']) {
  for (const item of LOCAL_CATALOG[kind]) {
    if (!/^[a-z0-9-]+$/.test(item.id)) throw new Error(`Unsafe route ID: ${item.id}`);
    await access(new URL(item.htmlUrl, output));
    routes.push(`${kind}/${item.id}`);
  }
}
const html = await readFile(new URL('index.html', output), 'utf8');
if (!html.includes('<base href="/">')) throw new Error('Route shells require the root base href');
for (const route of new Set(routes)) {
  const directory = new URL(`${route}/`, output);
  await mkdir(directory, { recursive: true });
  // Route is generated from validated IDs and fixed aliases, never visitor input.
  const redirect = `<script>location.replace('/#/${route}');</script>`;
  await writeFile(new URL('index.html', directory), html.replace('</head>', `${redirect}</head>`));
}
console.log(`Wrote ${new Set(routes).size} direct route entry files.`);
