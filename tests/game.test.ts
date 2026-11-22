import assert from 'node:assert/strict';
import test from 'node:test';
import { initialState, newMatch, nextRow, play, reducer, type Match } from '../lib/game.ts';

const round = (...columns: number[]) => columns.reduce((s, c) => play(s, c, s.turn), newMatch('X'));

test('gravity and alternating turns use the original column-major board', () => {
  const match = round(3, 3);
  assert.deepEqual(match.board[3], [' ', ' ', ' ', ' ', 'O', 'X']);
  assert.equal(match.turn, 'X');
  assert.equal(nextRow(match.board, 3), 3);
  assert.equal(play(match, 1, 'O'), match);
  for (const col of [-1, 7, 2.5, NaN]) assert.equal(play(match, col, 'X'), match);
});

test('a full column rejects another disc', () => {
  const match = round(1, 1, 1, 1, 1, 1);
  assert.equal(nextRow(match.board, 1), -1);
  assert.equal(play(match, 1, 'X'), match);
});

for (const [name, columns] of Object.entries({
  horizontal: [0, 6, 1, 6, 2, 5, 3],
  vertical: [0, 1, 0, 1, 0, 1, 0],
  rising: [0, 1, 1, 2, 5, 2, 2, 3, 5, 3, 6, 3, 3],
  falling: [6, 5, 5, 4, 1, 4, 4, 3, 1, 3, 0, 3, 3],
}))
  test('recognizes a ' + name + ' win and stops the round', () => {
    const match = round(...columns);
    assert.equal(match.winner, 'X');
    assert.equal(match.line.length, 4);
    assert.ok(match.line.every((cell) => match.board[cell.col][cell.row] === 'X'));
    assert.equal(play(match, 0, match.turn), match);
  });

test('a full winning-free board is a draw on the 42nd move', () => {
  const cols = [
    4, 5, 6, 5, 4, 1, 2, 1, 6, 4, 5, 2, 1, 5, 6, 4, 5, 2, 4, 1, 3, 2, 2, 2, 1, 6, 4, 1, 6, 6, 0, 3,
    3, 5, 0, 0, 3, 0, 0, 3, 0, 3,
  ];
  assert.equal(round(...cols.slice(0, -1)).winner, null);
  assert.equal(round(...cols).winner, 'draw');
});
test('a win increments its score once and the next starter applies on restart', () => {
  let state = initialState();
  const move = (col: number) => {
    state = reducer(state, { type: 'move', player: state.match.turn, col });
  };
  for (const col of [0, 6, 1, 6, 2, 5, 3]) move(col);
  move(1);
  assert.deepEqual(state.scores, { X: 1, O: 0, draw: 0 });
  state = reducer(state, { type: 'first', value: 'O' });
  assert.equal(state.match.winner, 'X');
  state = reducer(state, { type: 'new' });
  assert.equal(state.match.turn, 'O');
  assert.equal(state.match.moves.length, 0);
  assert.equal(state.round, 2);
  assert.equal(state.scores.X, 1);
});
test('menu changes do not discard an active board', () => {
  const match: Match = round(2, 1);
  let state = { ...initialState(), match };
  state = reducer(state, { type: 'difficulty', value: 'Hard' });
  state = reducer(state, { type: 'first', value: 'O' });
  assert.equal(state.match, match);
});
