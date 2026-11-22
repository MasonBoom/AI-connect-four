'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { COLS, nextRow, type Match } from '../lib/game';
import type { ColumnArea, Tabletop } from '../lib/tabletop';
import Landscape from './Landscape';
import { projectedCell, projectedColumn } from '../lib/board-view';

type Props = {
  match: Match;
  aim: number | null;
  setAim: (col: number | null) => void;
  drop: (col: number) => void;
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
    aim !== null && !match.winner && match.turn === 'X' ? nextRow(match.board, aim) : -1;
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
          <i className="poster-ghost" style={{ left: target.x + '%', top: target.y + '%' }} />
        )}
      </div>
    </div>
  );
}

export default function GameBoard({ match, aim, setAim, drop }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Tabletop | null>(null);
  const latest = useRef({ match, aim });
  const previous = useRef(match);
  const [areas, setAreas] = useState<ColumnArea[] | null>(null);
  // Keep an already-playable board on screen while the GPU module loads.
  useEffect(() => {
    latest.current = { match, aim };
  }, [match, aim]);
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
    stage.current?.setAim(aim);
  }, [aim]);
  return (
    <div className="stage" aria-label="Connect Four board">
      <Landscape />
      {!areas && <FallbackBoard match={match} aim={aim} />}
      <div ref={host} className="webgl-surface" />
      <div
        className={'column-controls' + (areas ? ' projected' : ' flat-controls')}
        role="group"
        aria-label="Choose a column"
      >
        {Array.from({ length: COLS }, (_, col) => {
          const area = areas?.[col] ?? projectedColumn(col);
          const full = nextRow(match.board, col) < 0;
          const disabled = full || !!match.winner || match.turn !== 'X';
          const stack = match.board[col]
            .filter((p) => p !== ' ')
            .reverse()
            .map((p) => (p === 'X' ? 'you' : 'computer'))
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
                (full ? ', full' : '')
              }
              className={'column-target' + (!disabled && aim === col ? ' selected' : '')}
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
