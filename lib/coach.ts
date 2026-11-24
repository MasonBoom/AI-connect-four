import { COLS, newMatch, play, type Match } from './game.ts';

export const drills = [
  {
    id: 'finish-the-row',
    title: 'Finish the row',
    goal: 'win',
    prompt: 'Where can Coral win on this move?',
    opening: [2, 7, 3, 7, 5, 6],
    hint: 'Scan the bottom row. A single empty space separates Coral’s discs.',
    success: 'Your disc fills the gap and connects four coral discs along the bottom row.',
    miss: 'The winning square is on the bottom row, between two coral discs.',
    takeaway: 'A row of four can come from filling a gap as well as extending a line.',
  },
  {
    id: 'block-the-stack',
    title: 'Block the stack',
    goal: 'block',
    prompt: 'Gold can win next turn. Where should Coral block?',
    opening: [2, 6, 3, 6, 7, 6],
    hint: 'Find the column with three gold discs stacked together. Look at the first empty square above them.',
    success: 'Your coral disc caps the gold stack. Gold has no winning move on the next turn.',
    miss: 'Find the stack of three gold discs.',
    takeaway: 'Before building your own line, check which squares would let your opponent win immediately.',
  },
  {
    id: 'spot-the-diagonal',
    title: 'Spot the diagonal',
    goal: 'win',
    prompt: 'This time you play Gold. Which drop completes the diagonal?',
    // The position immediately before Gold’s winning move in connectfour2.png.
    opening: [1, 2, 1, 1, 1, 5, 1, 7, 3, 3, 4, 4, 4, 4, 2, 4, 2, 2, 5, 2, 6, 5, 6, 5, 7],
    hint: 'Follow the gold diagonal from column 2 down toward column 5. Which gap already has support beneath it?',
    success: 'Your gold disc joins the diagonal running from column 2 down to column 5.',
    miss: 'Follow the gold discs down and to the right. Pay attention to where a disc can land.',
    takeaway: 'A diagonal threat is playable when the square below its gap is already occupied.',
  },
] as const;

export type Drill = (typeof drills)[number];
export type DrillId = Drill['id'];

export function drillById(id: unknown) {
  return drills.find((drill) => drill.id === id) ?? drills[0];
}

export function openingPosition(drill: Drill): Match {
  // Lesson notation uses the same one-based column numbers printed above the board.
  return drill.opening.reduce<Match>((match, column) => play(match, column - 1, match.turn), newMatch('X'));
}

export type Attempt = { correct: boolean; board: Match; reply: number | null };

export function assessDrop(drill: Drill, opening: Match, col: number): Attempt | null {
  const after = play(opening, col, opening.turn);
  if (after === opening) return null;
  if (drill.goal === 'win' || after.winner) {
    return { correct: after.winner === opening.turn, board: after, reply: null };
  }

  // For a missed block, put the actual winning reply on the board for review.
  for (let reply = 0; reply < COLS; reply++) {
    const response = play(after, reply, after.turn);
    if (response.winner === after.turn) return { correct: false, board: response, reply };
  }
  return { correct: true, board: after, reply: null };
}

export function suggestedColumn(drill: Drill, opening: Match): number | null {
  for (let col = 0; col < COLS; col++) {
    if (assessDrop(drill, opening, col)?.correct) return col;
  }
  return null;
}

export type Practice = {
  drillId: DrillId;
  attempted: number | null;
  completed: DrillId[];
};

export function newPractice(): Practice {
  return { drillId: drills[0].id, attempted: null, completed: [] };
}

export function enterDrill(state: Practice, drillId: DrillId): Practice {
  return { ...state, drillId, attempted: null };
}

export function tryDrop(state: Practice, col: number): Practice {
  if (state.attempted !== null) return state;
  const drill = drillById(state.drillId);
  const result = assessDrop(drill, openingPosition(drill), col);
  if (!result) return state;
  const completed = result.correct && !state.completed.includes(drill.id)
    ? [...state.completed, drill.id]
    : state.completed;
  return { ...state, attempted: col, completed };
}

const sessionKey = 'fourfold.coach.v1';
const solvedKey = (id: DrillId) => sessionKey + '.solved.' + id;

export function savePractice(storage: Pick<Storage, 'setItem'>, state: Practice) {
  // Independent completion flags let two tabs finish different drills without losing either result.
  for (const id of state.completed) storage.setItem(solvedKey(id), '1');
  storage.setItem(sessionKey, JSON.stringify({ drillId: state.drillId, attempted: state.attempted }));
}

export function loadPractice(storage: Pick<Storage, 'getItem'>): Practice {
  const state = newPractice();
  state.completed = drills.filter((drill) => storage.getItem(solvedKey(drill.id)) === '1').map((drill) => drill.id);
  try {
    const session = JSON.parse(storage.getItem(sessionKey) ?? 'null');
    const drill = drills.find((item) => item.id === session?.drillId);
    if (!drill) return state;
    state.drillId = drill.id;
    return Number.isInteger(session.attempted) ? tryDrop(state, session.attempted) : state;
  } catch {
    return state;
  }
}
