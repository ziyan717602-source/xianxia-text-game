import { GameState } from '../../game/types';
import { getOriginName } from '../../game/origins';
import { formatRealm, SEASON_LABELS } from '../constants';

interface StatusBarProps {
  gameState: GameState;
  onSave: () => void;
  onReset: () => void;
}

export function StatusBar({ gameState, onSave, onReset }: StatusBarProps) {
  const { time } = gameState;

  return (
    <header className="topbar">
      <div>
        <h1>文字修仙</h1>
        <p className="subtitle">
          第 {time.year} 年 {SEASON_LABELS[time.season]} 第 {time.day} 日
          <span aria-hidden="true"> / </span>
          {formatRealm(gameState)}
          <span aria-hidden="true"> / </span>
          {getOriginName(gameState)}
        </p>
      </div>
      <div className="save-actions">
        <button className="quiet-button" onClick={onSave}>保存</button>
        <button
          className="danger-button"
          onClick={() => {
            if (window.confirm('重置将丢失所有进度，确认？')) onReset();
          }}
        >
          重置
        </button>
      </div>
    </header>
  );
}
