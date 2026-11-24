import { ArrowLeft, ArrowRight, Keyboard } from 'lucide-react';

export default function BoardKeys() {
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
