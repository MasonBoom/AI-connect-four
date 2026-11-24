'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleCheck,
  Crosshair, GraduationCap, Grid2X2, Lightbulb, ListChecks, RotateCcw,
} from 'lucide-react';
import {
  assessDrop, drills, drillById, enterDrill, loadPractice, newPractice, openingPosition,
  savePractice, suggestedColumn, tryDrop, type DrillId,
} from '../lib/coach';
import { ROWS } from '../lib/game';
import BoardKeys from './BoardKeys';
import Brand from './Brand';
import GameBoard from './GameBoard';

const colors = { X: 'Coral', O: 'Gold' };

export default function Coach() {
  const [practice, setPractice] = useState(newPractice);
  const [ready, setReady] = useState(false);
  const [aim, setAim] = useState<number | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      setPractice(loadPractice(window.localStorage));
    } catch { /* Practice also works when browser storage is blocked. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      savePractice(window.localStorage, practice);
    } catch { /* Keep the current session playable. */ }
  }, [practice, ready]);

  const drill = drillById(practice.drillId);
  const opening = useMemo(() => openingPosition(drill), [drill]);
  const { attempted, completed } = practice;
  const attempt = useMemo(() => attempted === null ? null : assessDrop(drill, opening, attempted),
    [drill, opening, attempted]);
  const clueColumn = hintLevel === 2 && !attempt ? suggestedColumn(drill, opening) : null;
  const player = colors[opening.turn];
  const nextDrill = drills.find((item) => !completed.includes(item.id));
  const allSolved = completed.length === drills.length;

  const drop = useCallback((col: number) => {
    if (ready) setPractice((current) => tryDrop(current, col));
  }, [ready]);

  function startDrill(id: DrillId, keepHint = false) {
    setPractice((current) => enterDrill(current, id));
    setAim(null);
    if (!keepHint) setHintLevel(0);
    requestAnimationFrame(() => title.current?.focus());
  }

  let feedbackTitle = 'Your move';
  let feedback = 'Choose a numbered column to drop your disc.';
  if (attempt && attempted !== null) {
    if (attempt.correct) {
      feedbackTitle = 'Drill solved';
      feedback = drill.success;
    } else if (attempt.reply !== null) {
      feedbackTitle = 'Gold has a winning reply';
      feedback = 'After your drop in column ' + (attempted + 1) + ', Gold plays column ' +
        (attempt.reply + 1) + ' and connects four. The rings show that reply.';
    } else {
      feedbackTitle = 'Try a different column';
      const last = attempt.board.moves[attempt.board.moves.length - 1];
      feedback = 'Your disc lands in column ' + (attempted + 1) + ', row ' +
        (ROWS - last.row) + ' from the bottom. ' + drill.miss;
    }
  }
  const FeedbackIcon = !attempt ? Crosshair : attempt.correct ? CircleCheck : RotateCcw;

  return (
    <>
      <header className="topbar">
        <div className="top-inner">
          <Brand />
          <Link className="utility coach-home" href="/"><ArrowLeft /> Main menu</Link>
        </div>
      </header>
      <main className="shell coach-shell">
        <div className="intro coach-intro">
          <div>
            <h1>COACH <span>MODE</span></h1>
            <p>Solve three Connect Four positions, one move at a time.</p>
          </div>
        </div>
        <div className="play-layout coach-layout">
          <section className="panel board-panel" aria-labelledby="challenge-title">
            <div className="panel-head board-head">
              <span className="coach-board-label"><Grid2X2 /> Practice board</span>
              <span className="coach-side"><span aria-hidden="true" className={'token ' + opening.turn}><i /></span>
                You play {player}
              </span>
            </div>
            <div className="coach-brief">
              <h2 id="challenge-title" ref={title} tabIndex={-1}>{drill.title}</h2>
              <p>{drill.prompt}</p>
            </div>
            <GameBoard
              match={attempt?.board ?? opening}
              aim={aim}
              setAim={setAim}
              drop={drop}
              inputPlayer={ready && !attempt ? opening.turn : null}
              hintColumn={clueColumn}
              labels={colors}
            />
            <div className={'coach-review' + (attempt ? attempt.correct ? ' solved' : ' missed' : '')}>
              <div className="coach-verdict" role="status" aria-atomic="true">
                <FeedbackIcon aria-hidden="true" />
                <div><strong>{feedbackTitle}</strong><p>{feedback}</p></div>
              </div>
              {attempt && (
                <div className="coach-actions">
                  {attempt.correct && nextDrill && (
                    <button className="primary coach-action" onClick={() => startDrill(nextDrill.id)}>
                      Next drill <ArrowRight />
                    </button>
                  )}
                  <button className="secondary coach-action" onClick={() => startDrill(drill.id, !attempt.correct)}>
                    <RotateCcw /> {attempt.correct ? 'Replay drill' : 'Try again'}
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="coach-sidebar" aria-label="Practice tools">
            <section className="panel coach-notes" aria-labelledby="coach-notes-title">
              <div className="panel-head">
                <h2 id="coach-notes-title">{attempt ? <BookOpen /> : <Lightbulb />}
                  {attempt ? 'Coach’s note' : 'Coach’s hint'}
                </h2>
              </div>
              <div className="coach-note-body">
                <div aria-live="polite" aria-atomic="true">
                  <p>{attempt ? drill.takeaway : hintLevel ? drill.hint : 'Start with a clue. Reveal the suggested column if you want more help.'}</p>
                  {clueColumn !== null && <p className="coach-column-hint">Look at column {clueColumn + 1}.</p>}
                </div>
                {!attempt && (
                  <div className="coach-hint-actions">
                    {hintLevel < 2 && (
                      <button className="secondary coach-action" disabled={!ready}
                        onClick={() => setHintLevel(hintLevel + 1)}>
                        {hintLevel === 0 ? <Lightbulb /> : <Crosshair />}
                        {hintLevel === 0 ? 'Show hint' : 'Highlight column'}
                      </button>
                    )}
                    {hintLevel > 0 && <button className="coach-hide" onClick={() => setHintLevel(0)}>Hide hint</button>}
                  </div>
                )}
              </div>
            </section>
            <section className="panel coach-drills" aria-labelledby="drills-title">
              <div className="panel-head">
                <h2 id="drills-title"><ListChecks /> Practice drills</h2>
                <span className="coach-count" aria-label={completed.length + ' of ' + drills.length + ' drills complete'}>
                  {completed.length} / {drills.length}
                </span>
              </div>
              <div className="coach-progress" aria-hidden="true">
                {drills.map((item) => <i key={item.id} className={completed.includes(item.id) ? 'done' : ''} />)}
              </div>
              <ol className="coach-drill-list">
                {drills.map((item, i) => {
                  const done = completed.includes(item.id);
                  const selected = item.id === drill.id;
                  return (
                    <li key={item.id}>
                      <button
                        className="coach-drill"
                        aria-current={selected ? 'step' : undefined}
                        aria-label={item.title + (done ? ', completed' : '')}
                        onClick={() => startDrill(item.id)}
                        disabled={!ready}
                      >
                        <span className={'drill-number' + (done ? ' done' : '')} aria-hidden="true">
                          {done ? <Check /> : String(i + 1).padStart(2, '0')}
                        </span>
                        <strong>{item.title}</strong>
                        {selected && <ChevronRight className="drill-chevron" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {allSolved && <p className="coach-complete"><GraduationCap /> All three complete. Pick any drill to replay.</p>}
            </section>
          </aside>
        </div>
        <BoardKeys />
      </main>
    </>
  );
}
