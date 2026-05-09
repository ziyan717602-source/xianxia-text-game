import React from 'react';
import { EVENTS } from '../content/events';
import { SELECTABLE_ORIGINS } from '../content/origins';
import { getAvailableActionsAtLocation } from '../game/location';
import { hasSelectedOrigin } from '../game/origins';
import { getRecentSummary } from '../game/world';
import { SEASON_LABELS } from './constants';
import { useGameLoop } from './useGameLoop';
import { ResourcePanel } from './components/ResourcePanel';
import { ActionPanel } from './components/ActionPanel';
import { GameLog } from './components/GameLog';
import { EventDialog } from './components/EventDialog';
import { LocationSelector } from './components/LocationSelector';
import { StatusBar } from './components/StatusBar';
import { GameOverOverlay } from './components/GameOverOverlay';

export function App() {
  const { gameState, logs, chooseOrigin, doAction, moveLocation, handleEventChoice, saveGame, resetGame } = useGameLoop();
  const { activeEventId, time } = gameState;
  const selectedOrigin = hasSelectedOrigin(gameState);
  const activeEvent = activeEventId ? EVENTS.find((event) => event.id === activeEventId) : null;
  const availableActionIds = getAvailableActionsAtLocation(gameState);
  const recentSummary = getRecentSummary(gameState);
  const worldLogs = gameState.world.logs;
  const isGameOver = Boolean(gameState.choices.flags.game_over);
  const isAscended = gameState.ascension.ascended;

  if (!selectedOrigin) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>文字修仙</h1>
            <p className="subtitle">第 {time.year} 年 {SEASON_LABELS[time.season]} 第 {time.day} 日 / 出身未定</p>
          </div>
        </header>

        <main className="origin-shell">
          <section className="origin-intro">
            <h2>选择出身</h2>
            <p>出身只改变早期接触面。修什么道，仍看后来的行动与错过。</p>
          </section>

          <div className="origin-grid">
            {SELECTABLE_ORIGINS.map((origin) => (
              <button
                className="origin-option"
                data-origin-id={origin.id}
                key={origin.id}
                onClick={() => chooseOrigin(origin.id)}
              >
                <strong>{origin.name}</strong>
                <span>{origin.summary}</span>
                <small>{origin.description}</small>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {isGameOver && (
        <GameOverOverlay
          reason={gameState.choices.tags.game_over_reason ?? 'lifespan'}
          finalScore={null}
          isAscended={false}
          onReset={resetGame}
        />
      )}

      {isAscended && (
        <GameOverOverlay
          reason=""
          finalScore={gameState.ascension.finalScore}
          isAscended={true}
          onReset={resetGame}
        />
      )}

      {activeEvent && (
        <EventDialog
          eventText={typeof activeEvent.text === 'function' ? activeEvent.text(gameState) : activeEvent.text}
          choices={activeEvent.choices}
          eventId={activeEvent.id}
          onChoice={handleEventChoice}
        />
      )}

      <StatusBar
        gameState={gameState}
        onSave={saveGame}
        onReset={resetGame}
      />

      <main className="game-grid">
        <ResourcePanel gameState={gameState} />

        <section className="panel action-panel">
          <h2>行动</h2>
          <LocationSelector
            gameState={gameState}
            onMove={moveLocation}
          />
          <ActionPanel
            availableActionIds={availableActionIds}
            onAction={doAction}
            disabled={!!activeEventId}
          />
        </section>

        <GameLog
          logs={logs}
          recentSummary={recentSummary}
          worldLogs={worldLogs}
        />
      </main>
    </div>
  );
}
