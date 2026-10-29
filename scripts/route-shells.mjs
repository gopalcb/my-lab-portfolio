// GitHub Pages has no rewrite configuration: known routes get real entry files.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const output = new URL('dist/my-work-portfolio/browser/', root);
const catalogSource = await readFile(new URL('src/app/content/content.catalog.ts', root), 'utf8');
const compiled = ts.transpileModule(catalogSource, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { LOCAL_CATALOG } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const routes = ['projects', 'read', 'about-me', 'my-works', 'projects/aws-observability-redice', 'read/linux-essentials'];
for (const kind of ['projects', 'read']) {
  for (const item of LOCAL_CATALOG[kind]) {
    if (!/^[a-z0-9-]+$/.test(item.id)) throw new Error(`Unsafe route ID: ${item.id}`);
    routes.push(`${kind}/${item.id}`);
  }
}
const html = await readFile(new URL('index.html', output), 'utf8');
if (!html.includes('<base href="/">')) throw new Error('Route shells require the root base href');
for (const route of new Set(routes)) {
  const directory = new URL(`${route}/`, output);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), html);
}
await writeFile(new URL('404.html', output), html);
console.log(`Wrote ${new Set(routes).size} route entry files and an Angular 404 shell.`);
