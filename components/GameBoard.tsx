'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { COLS, nextRow, type Match, type Player } from '../lib/game';
import type { ColumnArea, Tabletop } from '../lib/tabletop';
import Landscape from './Landscape';
import { projectedCell, projectedColumn } from '../lib/board-view';

type Props = {
  match: Match;
  aim: number | null;
  setAim: (col: number | null) => void;
  drop: (col: number) => void;
  inputPlayer: Player | null;
  hintColumn?: number | null;
  labels?: Record<Player, string>;
};

function FallbackBoard({ match, aim }: Pick<Props, 'match' | 'aim'>) {
  const previousCount = useRef(match.moves.length);
  const [lastDrop, setLastDrop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const count = match.moves.length;
    setLastDrop(count === previousCount.current + 1 ? count - 1 : null);
    previousCount.current = count;
  }, [match.moves.length]);

  const targetRow =
    aim !== null ? nextRow(match.board, aim) : -1;
  const target = aim !== null && targetRow >= 0 ? projectedCell(aim, targetRow) : null;
  return (
    <div className="model-frame model-poster" aria-hidden="true">
      <img
        src="/tabletop.webp"
        alt=""
        width={1240}
        height={778}
        draggable={false}
        fetchPriority="high"
      />
      <div className="poster-pieces">
        {match.moves.map((move, i) => {
          const position = projectedCell(move.col, move.row);
          const won = match.line.some((cell) => cell.col === move.col && cell.row === move.row);
          const falling = lastDrop === i;
          return (
            <i
              key={move.col + ',' + move.row}
              className={'poster-chip ' + move.player + (won ? ' won' : '')}
              style={
                {
                  left: position.x + '%',
                  top: position.y + '%',
                  '--drop-distance': (-(6.58 - (1.03 + (5 - move.row) * 0.92)) / 0.76) * 100 + '%',
                } as CSSProperties
              }
            >
              <b className={falling ? 'falling' : ''} />
            </i>
          );
        })}
        {target && (
          <i className={'poster-ghost ' + match.turn} style={{ left: target.x + '%', top: target.y + '%' }} />
        )}
      </div>
    </div>
  );
}

const matchLabels: Record<Player, string> = { X: 'you', O: 'computer' };

export default function GameBoard({
  match, aim, setAim, drop, inputPlayer, hintColumn = null, labels = matchLabels,
}: Props) {
  const controls = useRef<HTMLDivElement>(null);
  const canDrop = !match.winner && match.turn === inputPlayer;
  const preview = canDrop ? aim ?? hintColumn : null;
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Tabletop | null>(null);
  const latest = useRef({ match, aim: preview });
  const previous = useRef(match);
  const [areas, setAreas] = useState<ColumnArea[] | null>(null);

  // Keep an already-playable board on screen while the GPU module loads.
  useEffect(() => {
    latest.current = { match, aim: preview };
  }, [match, preview]);

  useEffect(() => {
    let active = true;

    const fallback = () => {
      if (!active) return;
      stage.current?.dispose();
      stage.current = null;
      setAreas(null);
    };

    import('../lib/tabletop')
      .then(({ createTabletop }) => {
        if (!active || !host.current) return;
        const table = createTabletop(
          host.current,
          (bounds) => {
            if (active) setAreas(bounds);
          },
          fallback,
        );
        stage.current = table;
        table.setMatch(latest.current.match, false);
        table.setAim(latest.current.aim);
      })
      .catch(fallback);

    return () => {
      active = false;
      stage.current?.dispose();
      stage.current = null;
    };
  }, []);

  useEffect(() => {
    stage.current?.setMatch(match, previous.current.moves.length + 1 === match.moves.length);
    previous.current = match;
  }, [match]);

  useEffect(() => {
    stage.current?.setAim(preview);
  }, [preview]);

  useEffect(() => {
    if (!canDrop) return;

    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (/^[1-7]$/.test(event.key)) {
        event.preventDefault();
        drop(Number(event.key) - 1);
        return;
      }
      const onBoard = controls.current?.contains(target);
      if (target.closest('button, a') && !onBoard) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        let col = aim ?? Math.floor(COLS / 2);
        if (aim !== null || nextRow(match.board, col) < 0) {
          const step = event.key === 'ArrowRight' ? 1 : COLS - 1;
          for (let i = 0; i < COLS; i++) {
            col = (col + step) % COLS;
            if (nextRow(match.board, col) >= 0) break;
          }
        }
        controls.current?.querySelector<HTMLButtonElement>('[data-column="' + col + '"]')
          ?.focus({ preventScroll: true });
        setAim(col);
      } else if (event.key === 'Enter' && preview !== null && !onBoard) {
        event.preventDefault();
        drop(preview);
      }
    }

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [aim, canDrop, drop, match.board, preview, setAim]);

  return (
    <div className="stage" aria-label="Connect Four board">
      <Landscape />
      {!areas && <FallbackBoard match={match} aim={preview} />}
      <div ref={host} className="webgl-surface" />
      <div
        ref={controls}
        className={'column-controls' + (areas ? ' projected' : ' flat-controls')}
        role="group"
        aria-label="Choose a column"
      >
        {Array.from({ length: COLS }, (_, col) => {
          const area = areas?.[col] ?? projectedColumn(col);
          const full = nextRow(match.board, col) < 0;
          const disabled = full || !canDrop;
          const hinted = hintColumn === col && canDrop;
          const stack = match.board[col]
            .filter((p) => p !== ' ')
            .reverse()
            .map((p) => labels[p])
            .join(', ');
          return (
            <button
              type="button"
              key={col}
              aria-disabled={disabled}
              data-column={col}
              aria-label={
                'Column ' +
                (col + 1) +
                ', ' +
                (stack ? 'bottom to top: ' + stack : 'empty') +
                (full ? ', full' : '') + (hinted ? ', suggested column' : '')
              }
              className={'column-target' + (!disabled && aim === col ? ' selected' : '') + (hinted ? ' hinted' : '')}
              style={{
                left: area.left + '%',
                top: area.top + '%',
                width: area.width + '%',
                height: area.height + '%',
              }}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'touch') setAim(col);
              }}
              onPointerLeave={() => setAim(null)}
              onFocus={() => setAim(col)}
              onBlur={() => setAim(null)}
              onClick={() => {
                if (!disabled) drop(col);
              }}
            >
              <span className="column-number" aria-hidden="true">
                {col + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
