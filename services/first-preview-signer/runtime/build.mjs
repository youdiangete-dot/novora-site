import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const artifact = path.join(root, 'out/pr287-signer-runtime');
const tests = path.join(root, 'out/pr287-signer-runtime-tests');
// Resolve the Next.js compile-time poison marker ONLY in this isolated Node
// bundle. Do not change website resolution or copy its dependency/environment scope.
const serverOnly = { name: 'isolated-server-only', setup(b) {
  b.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'isolated' }));
  b.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({ contents: '', loader: 'js' }));
} };
await mkdir(path.join(artifact, 'api'), { recursive: true });
await mkdir(tests, { recursive: true });
const common = { bundle: true, platform: 'node', target: 'node24', format: 'esm',
  external: ['pg'], plugins: [serverOnly], metafile: true, logLevel: 'warning' };
const outputs = [];
for (const [entry, output] of [['api/prepare.mjs', 'api/prepare.mjs'], ['server.mjs', 'server.mjs']]) {
  const result = await build({ ...common, entryPoints: [path.join(here, entry)], outfile: path.join(artifact, output) });
  for (const input of Object.keys(result.metafile.inputs)) {
    if (/first-preview-(?:generation-lifecycle|queue|paid-admission)|supabase\.ts|openai.*provider/.test(input))
      throw new Error('Unexpected runtime dependency');
  }
  outputs.push(...Object.keys(result.metafile.inputs));
}
await build({ ...common, entryPoints: [path.join(here, 'runtime.test.mjs')],
  // Tests resolve the installed pg package from this package without depending
  // on repository parent node_modules; no Pool is ever connected in tests.
  external: [], outfile: path.join(tests, 'runtime.test.cjs'), format: 'cjs',
  outExtension: { '.js': '.cjs' } });
const pkg = JSON.parse(await readFile(path.join(here, 'package.json'), 'utf8'));
pkg.scripts = { start: 'node server.mjs' };
await writeFile(path.join(artifact, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
await writeFile(path.join(artifact, 'package-lock.json'), await readFile(path.join(here, 'package-lock.json')));
await writeFile(path.join(artifact, 'vercel.json'), JSON.stringify({ framework: null, buildCommand: null,
  installCommand: 'npm ci --omit=dev --ignore-scripts --no-audit --no-fund',
  functions: { 'api/prepare.mjs': { maxDuration: 30 } },
  routes: [{ src: '^/api/prepare$', dest: '/api/prepare.mjs' }, { src: '/.*', status: 404 }],
}, null, 2) + '\n');
await writeFile(path.join(artifact, 'source-manifest.json'), JSON.stringify([...new Set(outputs)].sort(), null, 2) + '\n');
console.info('Standalone Signer artifact and offline test bundle prepared. No runtime activation.');
