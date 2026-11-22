import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { loadPyodide } from 'pyodide';

// Exercise the shipped adapter with a real WebAssembly Python runtime. Only
// the browser's script loader, HTTP response, and worker mailbox are replaced.
test('the worker returns legal zero-based columns for a win and a forced block', async () => {
  const payload = await readFile(new URL('../main/connect_four.py', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../public/ai-worker.js', import.meta.url), 'utf8');
  const replies = [];
  const self = {
    location: { href: 'https://test.invalid/ai-worker.js' },
    postMessage: (message) => replies.push(message),
  };
  const context = {
    self,
    URL,
    importScripts: (url) => assert.equal(url, 'https://test.invalid/engine/pyodide.js'),
    fetch: async (url) => {
      assert.equal(url, 'https://test.invalid/engine/connect_four.py');
      return { ok: true, text: async () => payload };
    },
    loadPyodide: () => loadPyodide(),
  };
  vm.runInNewContext(worker, context);
  for (const [i, player] of ['O', 'X'].entries()) {
    const board = Array.from({ length: 7 }, () => Array(6).fill(' '));
    for (let col = 0; col < 3; col++) board[col][5] = player;
    await self.onmessage({ data: { kind: 'move', id: i, depth: 4, board } });
    assert.equal(replies[i].error, undefined);
    assert.equal(replies[i].id, i);
    assert.equal(replies[i].col, 3);
  }
});
