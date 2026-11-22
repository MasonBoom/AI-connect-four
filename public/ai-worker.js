/* The board is column-major, exactly as in main/connect_four.py. */
let enginePromise;
function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const root = new URL('./engine/', self.location.href).href;
      importScripts(root + 'pyodide.js');
      const [python, source] = await Promise.all([
        loadPyodide({ indexURL: root }),
        fetch(root + 'connect_four.py').then((response) => {
          if (!response.ok) throw new Error('Could not load the game engine.');
          return response.text();
        }),
      ]);
      python.FS.writeFile('/home/pyodide/connect_four.py', source);
      python.runPython(
        [
          'import json',
          'from connect_four import minimax, evaluate_board',
          'def choose_column(board_json, depth):',
          '    board = json.loads(board_json)',
          '    return minimax(board, False, depth, -float("inf"), float("inf"), evaluate_board)[1] - 1',
        ].join('\n'),
      );
      return python.globals.get('choose_column');
    })().catch((error) => {
      enginePromise = undefined;
      throw error;
    });
  }
  return enginePromise;
}
self.onmessage = async ({ data }) => {
  try {
    const choose = await loadEngine();
    if (data.kind === 'move') {
      const col = choose(JSON.stringify(data.board), data.depth);
      self.postMessage({ id: data.id, col });
    }
  } catch (error) {
    if (data.kind === 'move') self.postMessage({ id: data.id, error: String(error) });
  }
};
