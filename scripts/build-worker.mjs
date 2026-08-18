import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true });
const root = new URL('../dist/', import.meta.url);
const files = {};
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'server') continue;
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) await collect(path);
    else files[`/${relative(root.pathname, path.pathname).replaceAll('\\', '/')}`] = (await readFile(path)).toString('base64');
  }
}
await collect(root);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
await writeFile(new URL('../dist/server/index.js', import.meta.url), `const files = ${JSON.stringify(files)};
const types = ${JSON.stringify(types)};
export default { fetch(request) {
  const path = new URL(request.url).pathname;
  const key = files[path] ? path : '/index.html';
  const body = Uint8Array.from(atob(files[key]), char => char.charCodeAt(0));
  return new Response(body, { headers: { 'content-type': types[key.slice(key.lastIndexOf('.'))] || 'application/octet-stream', 'cache-control': key === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable' } });
} };
`);
