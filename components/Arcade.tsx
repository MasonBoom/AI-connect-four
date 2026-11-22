'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Gamepad2,
  Grid2X2,
  Keyboard,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  Volume2,
  VolumeX,
  X as Close,
} from 'lucide-react';
import GameBoard from './GameBoard';
import {
  COLS,
  DEPTH,
  initialState,
  loadGame,
  nextRow,
  reducer,
  saveGame,
  type Difficulty,
  type Player,
} from '../lib/game';

const robot = [
  '.....p......p.....',
  '......p....p......',
  '.....pppppppp.....',
  '...pppppppppppp...',
  '..ppPPPPPPPPPPpp..',
  '.ppPDDDDDDDDDDPpp.',
  'ppPPDwwDDDDwwDPPpp',
  'ppPPDwwDDDDwwDPPpp',
  '.ppPDDDDDDDDDDPpp.',
  '..ppPPPPPPPPPPpp..',
  '...ppppDDDDpppp...',
  '.....pPPPPPPp.....',
  '...ppPPPppPPPpp...',
  '...ppppp..ppppp...',
];
const robotColor: Record<string, string> = {
  p: '#9c75d1',
  P: '#d8b9ff',
  D: '#382648',
  w: '#ffdd97',
};
function PixelBot() {
  return (
    <div className="portrait" aria-hidden="true">
      <svg viewBox="0 0 22 20" shapeRendering="crispEdges">
        {robot.flatMap((line, y) =>
          Array.from(line, (v, x) =>
            v === '.' ? null : (
              <rect
                key={y + '-' + x}
                x={x + 2}
                y={y + 3}
                width="1"
                height="1"
                fill={robotColor[v]}
              />
            ),
          ),
        )}
      </svg>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand" aria-label="Fourfold Arcade">
      <div className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="brand-words">
        <strong>FOURFOLD</strong>
        <span>ARCADE</span>
      </div>
    </div>
  );
}
function Token({ player }: { player: Player | 'draw' }) {
  return (
    <span aria-hidden="true" className={'token ' + (player === 'draw' ? 'draw' : player)}>
      <i />
    </span>
  );
}
function Keys() {
  return (
    <div className="key-legend" aria-label="Keyboard shortcuts">
      <span className="key-icon">
        <Keyboard size={17} /> <span>Keyboard</span>
      </span>
      <span>
        <kbd>1</kbd>
        <i>–</i>
        <kbd>7</kbd>
        <span>Drop disc</span>
      </span>
      <span>
        <kbd aria-label="Left arrow">
          <ArrowLeft />
        </kbd>
        <kbd aria-label="Right arrow">
          <ArrowRight />
        </kbd>
        <span>Select</span>
      </span>
      <span>
        <kbd>Enter</kbd>
        <span>Drop</span>
      </span>
    </div>
  );
}
const pad = (value: number) => String(value).padStart(2, '0');

export default function Arcade() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);
  const [aim, setAim] = useState<number | null>(null);
  const [modal, setModal] = useState<'help' | 'new' | null>(null);
  const [aiError, setAiError] = useState(false);
  const [retry, setRetry] = useState(0);
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { match, difficulty, scores, first } = state;
  const { winner, turn, moves } = match;
  const active = !winner;
  const thinking = active && turn === 'O';

  useEffect(() => {
    try {
      dispatch({ type: 'restore', value: loadGame() });
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      try {
        saveGame(state);
      } catch {
        /* Play still works with storage disabled. */
      }
  }, [state, hydrated]);
  useEffect(() => {
    return () => {
      worker.current?.terminate();
      worker.current = null;
      if (audio.current) void audio.current.close().catch(() => {});
    };
  }, []);
  const getWorker = useCallback(() => {
    if (!worker.current)
      worker.current = new Worker(new URL('/ai-worker.js', window.location.origin), {
        name: 'fourfold-minimax',
      });
    return worker.current;
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        getWorker().postMessage({ kind: 'warm' });
      } catch {
        /* The next move exposes a retry. */
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [hydrated, getWorker]);
  useEffect(() => {
    setAiError(false);
    if (!hydrated || match.winner || match.turn !== 'O') return;
    const id = ++request.current;
    let engine: Worker;
    let timer: ReturnType<typeof setTimeout>;
    const start = performance.now();
    const fail = () => {
      setAiError(true);
    };
    const receive = (event: MessageEvent<{ id: number; col?: number; error?: string }>) => {
      if (event.data.id !== id) return;
      const col = event.data.col;
      if (event.data.error || typeof col !== 'number' || nextRow(match.board, col) < 0) {
        fail();
        return;
      }
      timer = setTimeout(
        () => dispatch({ type: 'move', player: 'O', col }),
        Math.max(0, 510 - (performance.now() - start)),
      );
    };
    try {
      engine = getWorker();
      engine.addEventListener('message', receive);
      engine.addEventListener('error', fail);
      engine.postMessage({ kind: 'move', id, depth: DEPTH[difficulty], board: match.board });
    } catch {
      fail();
    }
    return () => {
      clearTimeout(timer);
      engine?.removeEventListener('message', receive);
      engine?.removeEventListener('error', fail);
    };
  }, [match, difficulty, retry, hydrated, getWorker]);

  const unlockAudio = useCallback(() => {
    try {
      audio.current ??= new AudioContext();
      if (audio.current.state === 'suspended') void audio.current.resume().catch(() => {});
    } catch {
      /* Browsers without Web Audio can still play. */
    }
  }, []);
  const seenMoves = useRef(0);
  useEffect(() => {
    const previous = seenMoves.current;
    seenMoves.current = moves.length;
    const ctx = audio.current,
      last = moves.at(-1);
    if (!state.sound || !last || !ctx || ctx.state !== 'running' || moves.length !== previous + 1)
      return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      now = ctx.currentTime;
    const freq = last.player === 'X' ? 290 : 215;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.43, now + 0.115);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.105, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }, [moves, state.sound]);
  const drop = useCallback(
    (col: number) => {
      if (!hydrated || modal || match.winner || match.turn !== 'X' || nextRow(match.board, col) < 0)
        return;
      if (state.sound) unlockAudio();
      dispatch({ type: 'move', player: 'X', col });
    },
    [hydrated, modal, match, state.sound, unlockAudio],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat ||
        modal ||
        thinking ||
        winner
      )
        return;
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (/^[1-7]$/.test(e.key)) {
        e.preventDefault();
        drop(Number(e.key) - 1);
        return;
      }
      if (el.closest('button, a') && !el.closest('.column-controls')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        let col = aim ?? 3;
        if (aim !== null || nextRow(match.board, col) < 0) {
          for (let i = 0; i < COLS; i++) {
            col = (col + (e.key === 'ArrowRight' ? 1 : COLS - 1)) % COLS;
            if (nextRow(match.board, col) >= 0) break;
          }
        }
        setAim(col);
        document
          .querySelector<HTMLButtonElement>('button[data-column="' + col + '"]')
          ?.focus({ preventScroll: true });
      } else if (e.key === 'Enter' && aim !== null && !el.closest('.column-controls')) {
        e.preventDefault();
        drop(aim);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aim, drop, match.board, modal, thinking, winner]);

  useEffect(() => {
    const el = dialog.current;
    if (modal && el && !el.open) el.showModal();
    else if (!modal && el?.open) el.close();
  }, [modal]);
  function startRound() {
    if (thinking) {
      worker.current?.terminate();
      worker.current = null;
    }
    setAim(null);
    setAiError(false);
    dispatch({ type: 'new' });
    setModal(null);
  }
  function retryMove() {
    worker.current?.terminate();
    worker.current = null;
    setRetry((n) => n + 1);
  }
  const status =
    winner === 'draw'
      ? 'Round drawn'
      : winner === 'X'
        ? 'You win!'
        : winner === 'O'
          ? 'Computer wins'
          : aiError
            ? 'Computer paused'
            : thinking
              ? 'Computer’s turn'
              : 'Your turn';
  const hint = winner
    ? 'Start a new game to play again.'
    : aiError
      ? 'The opponent could not finish its move.'
      : thinking
        ? 'Minimax is choosing a column.'
        : moves.at(-1)?.player === 'O'
          ? 'Computer played column ' + (moves.at(-1)!.col + 1) + '.'
          : 'Choose a column to drop your disc.';
  return (
    <>
      <header className="topbar">
        <div className="top-inner">
          <Brand />
          <nav aria-label="Game controls">
            <button
              className="utility"
              type="button"
              aria-pressed={state.sound}
              onClick={() => {
                if (!state.sound) unlockAudio();
                dispatch({ type: 'sound' });
              }}
            >
              {state.sound ? <Volume2 /> : <VolumeX />}
              <span>Sound {state.sound ? 'on' : 'off'}</span>
            </button>
            <span className="nav-divider" />
            <button className="utility how" type="button" onClick={() => setModal('help')}>
              <CircleHelp />
              <span>How to play</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="shell">
        <div className="intro">
          <div>
            <div className="mode-label">
              <Gamepad2 size={16} />
              <span>Single player</span>
            </div>
            <h1>
              CONNECT <span>FOUR</span>
            </h1>
            <p>Drop your discs. Connect four in a row.</p>
          </div>
          <button
            type="button"
            className="primary new-game"
            onClick={() => {
              if (active && moves.length) setModal('new');
              else startRound();
            }}
          >
            <Plus size={19} strokeWidth={2.7} />
            New game
          </button>
        </div>
        <div className="play-layout">
          <section className="panel board-panel" aria-labelledby="board-heading">
            <div className="panel-head board-head">
              <h2 id="board-heading">
                <Grid2X2 />
                Game board
              </h2>
              <span className={'live-label' + (active ? '' : ' finished')}>
                <i />
                {active ? 'In play' : 'Finished'}
              </span>
            </div>
            <GameBoard match={match} aim={aim} setAim={setAim} drop={drop} />
            <div className="board-status">
              <div className="status-group" role="status" aria-live="polite" aria-atomic="true">
                <Token player={winner ?? turn} />
                <div>
                  <strong>{status}</strong>
                  <p>{hint}</p>
                </div>
              </div>
              {aiError && thinking ? (
                <button className="retry" onClick={retryMove}>
                  <RotateCcw size={15} />
                  Retry move
                </button>
              ) : (
                <div className="move-count">
                  <span>Moves</span>
                  <strong>{pad(moves.length)}</strong>
                </div>
              )}
            </div>
          </section>
          <aside className="sidebar" aria-label="Match details">
            <section className="panel settings" aria-labelledby="settings-title">
              <div className="panel-head">
                <h2 id="settings-title">
                  <SlidersHorizontal />
                  Game settings
                </h2>
              </div>
              <div className="settings-body">
                <div className="opponent">
                  <PixelBot />
                  <div>
                    <span className="micro">Opponent</span>
                    <strong>Minimax AI</strong>
                  </div>
                </div>
                <fieldset className="difficulty">
                  <legend>Difficulty</legend>
                  <div className="segments">
                    {(Object.keys(DEPTH) as Difficulty[]).map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={difficulty === value}
                        onClick={() => dispatch({ type: 'difficulty', value })}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="first-move">
                  <span>
                    {moves.length && first !== match.starter ? 'Next opener' : 'First move'}
                  </span>
                  <span className="select-wrap">
                    <select
                      aria-label="First move"
                      value={first}
                      onChange={(e) => dispatch({ type: 'first', value: e.target.value as Player })}
                    >
                      <option value="X">You</option>
                      <option value="O">Computer</option>
                    </select>
                    <ChevronDown aria-hidden="true" />
                  </span>
                </label>
              </div>
            </section>
            <section className="panel score-panel" aria-labelledby="score-title">
              <div className="panel-head">
                <h2 id="score-title">
                  <Trophy />
                  Scoreboard
                </h2>
                <span className="round">Round {pad(state.round)}</span>
              </div>
              <div className="score-list">
                {(['X', 'O', 'draw'] as const).map((p) => (
                  <div className={'score-row score-' + p} key={p}>
                    <span>
                      <Token player={p} />
                      {p === 'X' ? 'You' : p === 'O' ? 'Computer' : 'Draws'}
                    </span>
                    <strong>{pad(scores[p])}</strong>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
        <Keys />
      </main>
      <dialog
        ref={dialog}
        aria-labelledby="dialog-title"
        onCancel={() => setModal(null)}
        onClose={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        className="dialog"
      >
        {modal && (
          <div className="dialog-card">
            <div className="panel-head">
              <h2 id="dialog-title">
                {modal === 'help' ? <Gamepad2 /> : <RotateCcw />}
                {modal === 'help' ? 'How to play' : 'New game'}
              </h2>
              <button aria-label="Close dialog" className="close" onClick={() => setModal(null)}>
                <Close size={20} />
              </button>
            </div>
            {modal === 'help' ? (
              <div className="dialog-body">
                <div className="four-tokens" aria-hidden="true">
                  <Token player="X" />
                  <Token player="X" />
                  <Token player="X" />
                  <Token player="X" />
                </div>
                <h3>Four in a row wins.</h3>
                <p>
                  You play coral. The computer plays gold. Choose a column and your disc falls into
                  its lowest open space.
                </p>
                <p>
                  Connect four of your discs horizontally, vertically, or diagonally. A full board
                  with no winner is a draw.
                </p>
                <div className="dialog-keys">
                  <Keyboard size={16} />
                  <span>
                    Press <b>1–7</b> to drop, or use the arrow keys and <b>Enter</b>.
                  </span>
                </div>
                <button className="primary" onClick={() => setModal(null)}>
                  Got it
                </button>
              </div>
            ) : (
              <div className="dialog-body">
                <h3>Start a new round?</h3>
                <p>This ends the current game and keeps your scoreboard.</p>
                <div className="dialog-actions">
                  <button className="secondary" onClick={() => setModal(null)}>
                    Keep playing
                  </button>
                  <button className="primary" onClick={startRound}>
                    Start new game
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
