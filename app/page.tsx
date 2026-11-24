import Brand from '../components/Brand';
import Landscape from '../components/Landscape';
import ModeSelector from '../components/ModeSelector';
import { projectedCell } from '../lib/board-view';
import './welcome.css';

// Bottom-to-top stacks on the decorative board, from the leftmost column.
const displayColumns = ['O', 'X', 'XO', 'OXO', 'XOXX', 'O', ''];

export default function WelcomePage() {
  return (
    <>
      <header className="topbar">
        <div className="top-inner">
          <Brand />
        </div>
      </header>
      <main className="welcome-shell">
        <section className="cabinet" aria-labelledby="welcome-title">
          <div className="welcome-scene">
            <Landscape />
            <div className="welcome-board" aria-hidden="true">
              <img src="/tabletop.webp" alt="" width={1240} height={778} fetchPriority="high" />
              <div className="poster-pieces">
                {displayColumns.map((stack, col) =>
                  Array.from(stack, (color, index) => {
                    const { x, y } = projectedCell(col, 5 - index);
                    return (
                      <i
                        key={col + '-' + index}
                        className={'poster-chip ' + color}
                        style={{ left: x + '%', top: y + '%' }}
                      >
                        <b />
                      </i>
                    );
                  }),
                )}
              </div>
            </div>
            <div className="welcome-copy">
              <p className="welcome-greeting">Welcome to Fourfold Arcade</p>
              <h1 id="welcome-title">CONNECT <span>FOUR</span></h1>
              <p className="welcome-intro">Drop your discs. Get four in a row before the computer does.</p>
            </div>
          </div>
          <ModeSelector />
        </section>
      </main>
    </>
  );
}
