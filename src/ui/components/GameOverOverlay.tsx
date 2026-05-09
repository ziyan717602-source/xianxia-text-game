interface GameOverOverlayProps {
  reason: string;
  finalScore: number | null;
  isAscended: boolean;
  onReset: () => void;
}

export function GameOverOverlay({ reason, finalScore, isAscended, onReset }: GameOverOverlayProps) {
  if (isAscended) {
    return (
      <div className="ascension-overlay" role="presentation">
        <section className="ascension-dialog" role="dialog" aria-modal="true" aria-labelledby="ascension-title">
          <p className="eyebrow" id="ascension-title">飞升</p>
          <p className="event-text">
            天门已开。此身已非凡躯，修行一程至此。
          </p>
          {finalScore !== null && (
            <p className="muted">终分：{finalScore}</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="ascension-overlay" role="presentation">
      <section className="ascension-dialog" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <p className="eyebrow" id="gameover-title">
          {reason === 'lifespan' ? '寿元已尽' : '伤重不治'}
        </p>
        <p className="event-text">
          {reason === 'lifespan'
            ? '气数已尽，此身归于天地。'
            : '伤痕累累，再难撑持。'}
        </p>
        <div className="event-actions">
          <button className="choice-button" onClick={onReset}>重新开始</button>
        </div>
      </section>
    </div>
  );
}
