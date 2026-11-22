import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const runtime = dirname(require.resolve('pyodide/pyodide.js'));
const target = join(root, 'public', 'engine');
const files = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
];
await mkdir(target, { recursive: true });
await Promise.all([
  ...files.map((file) => copyFile(join(runtime, file), join(target, file))),
  copyFile(join(root, 'main/connect_four.py'), join(target, 'connect_four.py')),
]);
