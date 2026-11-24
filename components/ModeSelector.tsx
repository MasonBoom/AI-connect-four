'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, GraduationCap, Play } from 'lucide-react';

export default function ModeSelector() {
  const surface = useRef<HTMLDivElement>(null);
  const play = useRef<HTMLButtonElement>(null);
  const coach = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;
    import('../lib/mode-keys')
      .then(({ mountModeKeys }) => {
        if (active && surface.current && play.current && coach.current) {
          dispose = mountModeKeys(surface.current, play.current, coach.current);
        }
      })
      .catch(() => { /* Keep the native buttons if the renderer is unavailable. */ });
    return () => {
      active = false;
      dispose?.();
    };
  }, []);

  return (
    <form
      action="/play/"
      method="get"
      className="mode-deck"
      aria-label="Game mode"
      onSubmit={(event) => {
        event.preventDefault();
        const { submitter } = event.nativeEvent as SubmitEvent;
        router.push(submitter === coach.current ? '/coach/' : '/play/');
      }}
    >
      <div className="mode-keys">
        <div className="mode-surface" ref={surface} aria-hidden="true" />
        <button
          ref={play}
          type="submit"
          className="mode-key play-key"
          aria-labelledby="play-label"
          aria-describedby="play-detail"
        >
          <span className="key-symbol" aria-hidden="true"><Play fill="currentColor" /></span>
          <span className="key-copy">
            <strong id="play-label">Play Connect Four</strong>
            <small id="play-detail">Versus the computer</small>
          </span>
          <ArrowRight className="key-end" aria-hidden="true" />
        </button>
        <button
          ref={coach}
          type="submit"
          formAction="/coach/"
          className="mode-key coach-key"
          aria-labelledby="coach-label"
          aria-describedby="coach-detail"
        >
          <span className="key-symbol" aria-hidden="true"><GraduationCap /></span>
          <span className="key-copy">
            <strong id="coach-label">Coach Mode</strong>
            <small id="coach-detail">Guided tactics practice</small>
          </span>
          <ArrowRight className="key-end" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
