import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessDrop, drills, enterDrill, loadPractice, newPractice, openingPosition,
  savePractice, suggestedColumn, tryDrop,
} from '../lib/coach.ts';
import { COLS, initialState, loadGame, newMatch, play, reducer, saveGame } from '../lib/game.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

for (const [index, drill] of drills.entries()) {
  test(drill.title + ' starts from a legal position and has one supported solution', () => {
    const opening = openingPosition(drill);
    assert.equal(opening.moves.length, drill.opening.length);
    assert.equal(opening.winner, null);
    assert.equal(opening.turn, index === 2 ? 'O' : 'X');
    const correct = Array.from({ length: COLS }, (_, col) => col)
      .filter((col) => assessDrop(drill, opening, col)?.correct);
    assert.deepEqual(correct, [[3], [5], [2]][index]);
    assert.equal(suggestedColumn(drill, opening), correct[0]);
    assert.deepEqual(opening, openingPosition(drill));
  });
}

test('Gold’s 26th move reproduces the diagonal in the project screenshot', () => {
  const drill = drills[2];
  const opening = openingPosition(drill);
  const attempt = assessDrop(drill, opening, 2)!;
  assert.equal(attempt.board.winner, 'O');
  assert.equal(attempt.board.moves.length, 26);
  assert.deepEqual(attempt.board.board.map((col) => [...col].reverse().join('').trimEnd()),
    ['XXOXX', 'OXXOO', 'XOO', 'XOXOO', 'OXOO', 'XX', 'OX']);
  assert.deepEqual(attempt.board.line.map(({ col, row }) => [col, row]).sort(),
    [[1, 2], [2, 3], [3, 4], [4, 5]]);
});

test('missing the block displays a legal winning reply, and blocking prevents every immediate win', () => {
  const drill = drills[1];
  const opening = openingPosition(drill);
  for (let col = 0; col < COLS; col++) {
    const attempt = assessDrop(drill, opening, col)!;
    if (col === 5) {
      assert.equal(attempt.reply, null);
      assert.equal(attempt.board.moves.length, opening.moves.length + 1);
      for (let reply = 0; reply < COLS; reply++) {
        assert.notEqual(play(attempt.board, reply, 'O').winner, 'O');
      }
    } else {
      assert.equal(attempt.reply, 5);
      assert.equal(attempt.board.winner, 'O');
      assert.deepEqual(attempt.board.moves.slice(-2).map((m) => [m.player, m.col]), [['X', col], ['O', 5]]);
    }
  }
});

test('invalid moves, extra clicks, and retries never award a second completion', () => {
  const first = newPractice();
  for (const col of [-1, 7, 2.5, NaN]) assert.equal(tryDrop(first, col), first);
  const full = Array.from({ length: 6 }).reduce<ReturnType<typeof newMatch>>(
    (match) => play(match, 0, match.turn), newMatch('X'));
  assert.equal(assessDrop(drills[0], full, 0), null);
  const miss = tryDrop(first, 0);
  assert.deepEqual(miss.completed, []);
  assert.equal(tryDrop(miss, 3), miss);
  const retry = enterDrill(miss, first.drillId);
  assert.equal(retry.attempted, null);
  const solved = tryDrop(retry, 3);
  assert.deepEqual(solved.completed, [first.drillId]);
  assert.equal(tryDrop(solved, 0), solved);
  assert.deepEqual(tryDrop(enterDrill(solved, first.drillId), 3).completed, solved.completed);
});

test('practice restores the selected position, last move, and independent completions across tabs', () => {
  const storage = memoryStorage();
  savePractice(storage, tryDrop(newPractice(), 3));
  const otherTab = tryDrop(enterDrill(newPractice(), drills[1].id), 5);
  savePractice(storage, otherTab);
  let restored = loadPractice(storage);
  assert.deepEqual(restored, { ...otherTab, completed: [drills[0].id, drills[1].id] });
  const miss = tryDrop(enterDrill(restored, drills[2].id), 6);
  savePractice(storage, miss);
  restored = loadPractice(storage);
  assert.deepEqual(restored, miss);
  for (const bad of ['{', '{"drillId":"unknown","attempted":3}', '{"drillId":"finish-the-row","attempted":42}']) {
    storage.setItem('fourfold.coach.v1', bad);
    assert.deepEqual(loadPractice(storage), { ...newPractice(), completed: miss.completed });
  }
});

test('coach and match saves preserve each other’s scores, options, board, and progress', () => {
  const storage = memoryStorage();
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    let match = initialState();
    for (const col of [0, 6, 1, 6, 2, 5, 3]) {
      match = reducer(match, { type: 'move', player: match.match.turn, col });
    }
    match = reducer(match, { type: 'new' });
    match = reducer(match, { type: 'move', player: 'X', col: 2 });
    match = reducer(match, { type: 'difficulty', value: 'Hard' });
    saveGame(match);
    const bytes = storage.getItem('fourfold.arcade.v1');
    const practice = tryDrop(enterDrill(newPractice(), drills[2].id), 2);
    savePractice(storage, practice);
    assert.equal(storage.getItem('fourfold.arcade.v1'), bytes);
    assert.deepEqual(loadGame(), match);
    saveGame(reducer(match, { type: 'move', player: 'O', col: 3 }));
    assert.deepEqual(loadPractice(storage), practice);
  } finally {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
