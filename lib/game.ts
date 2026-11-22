export const COLS = 7;
export const ROWS = 6;
export type Player = 'X' | 'O';
export type Cell = Player | ' ';
export type Board = Cell[][];
export type Point = { col: number; row: number };
export type Move = Point & { player: Player };
export type Difficulty = 'Easy' | 'Normal' | 'Hard';
export const DEPTH: Record<Difficulty, number> = { Easy: 2, Normal: 4, Hard: 5 };
export type Score = Record<Player | 'draw', number>;
export type Match = {
  board: Board;
  moves: Move[];
  starter: Player;
  turn: Player;
  winner: Player | 'draw' | null;
  line: Point[];
};
export type State = {
  match: Match;
  scores: Score;
  round: number;
  first: Player;
  difficulty: Difficulty;
  sound: boolean;
};

export function newMatch(starter: Player): Match {
  return {
    board: Array.from({ length: COLS }, () => Array<Cell>(ROWS).fill(' ')),
    moves: [],
    starter,
    turn: starter,
    winner: null,
    line: [],
  };
}
export function initialState(): State {
  return {
    match: newMatch('X'),
    scores: { X: 0, O: 0, draw: 0 },
    round: 1,
    first: 'X',
    difficulty: 'Normal',
    sound: true,
  };
}

export function nextRow(board: Board, col: number) {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return -1;
  return board[col].lastIndexOf(' ');
}

// Return every connected winning cell, including a move completing two lines.
function winningCells(board: Board, move: Move): Point[] {
  const wins = new Map<number, Point>();
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]) {
    const run: Point[] = [move];
    for (const sign of [-1, 1]) {
      let col = move.col + sign * dx;
      let row = move.row + sign * dy;
      while (board[col]?.[row] === move.player) {
        run.push({ col, row });
        col += sign * dx;
        row += sign * dy;
      }
    }
    if (run.length >= 4) for (const cell of run) wins.set(cell.col * ROWS + cell.row, cell);
  }
  return [...wins.values()];
}
export function play(match: Match, col: number, player: Player): Match {
  if (match.winner || match.turn !== player) return match;
  const row = nextRow(match.board, col);
  if (row < 0) return match;
  const board = match.board.slice();
  board[col] = match.board[col].slice();
  board[col][row] = player;
  const move = { col, row, player };
  const moves = [...match.moves, move];
  const line = winningCells(board, move);
  const winner = line.length ? player : moves.length === ROWS * COLS ? 'draw' : null;
  return { ...match, board, moves, line, winner, turn: player === 'X' ? 'O' : 'X' };
}
export type Action =
  | { type: 'move'; col: number; player: Player }
  | { type: 'first'; value: Player }
  | { type: 'difficulty'; value: Difficulty }
  | { type: 'sound' | 'new' }
  | { type: 'restore'; value: State };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'restore':
      return action.value;
    case 'new':
      return { ...state, round: state.round + 1, match: newMatch(state.first) };
    case 'difficulty':
      return { ...state, difficulty: action.value };
    case 'sound':
      return { ...state, sound: !state.sound };
    case 'first':
      return {
        ...state,
        first: action.value,
        match: state.match.moves.length ? state.match : newMatch(action.value),
      };
    case 'move': {
      const match = play(state.match, action.col, action.player);
      if (match === state.match) return state;
      const scores = match.winner
        ? { ...state.scores, [match.winner]: state.scores[match.winner] + 1 }
        : state.scores;
      return { ...state, match, scores };
    }
  }
}

const STORAGE_KEY = 'fourfold.arcade.v1';
export function saveGame(state: State) {
  const { first, round, difficulty, scores, sound, match } = state;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      first,
      round,
      difficulty,
      scores,
      sound,
      starter: match.starter,
      moves: match.moves.map((m) => m.col),
    }),
  );
}
export function loadGame(): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState();
  const data = JSON.parse(raw);
  const isPlayer = (v: unknown) => v === 'X' || v === 'O';
  if (
    !data ||
    !isPlayer(data.first) ||
    !isPlayer(data.starter) ||
    !Array.isArray(data.moves) ||
    data.moves.length > COLS * ROWS ||
    !Object.hasOwn(DEPTH, data.difficulty) ||
    typeof data.sound !== 'boolean' ||
    !Number.isSafeInteger(data.round) ||
    data.round < 1 ||
    !['X', 'O', 'draw'].every((k) => Number.isSafeInteger(data.scores?.[k]) && data.scores[k] >= 0)
  )
    return initialState();
  let match = newMatch(data.starter);
  for (const col of data.moves) {
    const result = play(match, col, match.turn);
    if (result === match) return initialState();
    match = result;
  }
  return {
    match,
    round: data.round,
    scores: data.scores,
    first: data.first,
    difficulty: data.difficulty,
    sound: data.sound,
  };
}
