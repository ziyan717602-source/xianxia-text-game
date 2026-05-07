import React from 'react';
import { ACTIONS } from '../content/actions';
import { EVENTS } from '../content/events';
import { LOCATIONS } from '../content/locations';
import { getAvailableActionsAtLocation } from '../game/location';
import { getVisibleResourceIds, RESOURCE_LABELS, ResourceId } from '../game/resources';
import { DAYS_PER_YEAR, TICKS_PER_DAY } from '../game/state';
import { Realm, Season } from '../game/types';
import { useGameLoop } from './useGameLoop';

const SEASON_LABELS: Record<Season, string> = {
  [Season.Spring]: '春',
  [Season.Summer]: '夏',
  [Season.Autumn]: '秋',
  [Season.Winter]: '冬',
};

const REALM_LABELS: Record<Realm, string> = {
  [Realm.Mortal]: '凡人',
  [Realm.QiCondensation]: '炼气',
  [Realm.FoundationEstablishment]: '筑基',
  [Realm.GoldenCore]: '金丹',
  [Realm.NascentSoul]: '元婴',
};

function formatResourceValue(resourceId: ResourceId, value: number) {
  if (resourceId === 'lifespan') {
    return `${Math.floor(value / (DAYS_PER_YEAR * TICKS_PER_DAY))} 年`;
  }
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function formatRealm(state: { realm: Realm; realmLayer: number }) {
  if (state.realm === Realm.QiCondensation && state.realmLayer > 0) {
    return `${REALM_LABELS[state.realm]}${state.realmLayer}层`;
  }
  return REALM_LABELS[state.realm];
}

export function App() {
  const { gameState, logs, doAction, moveLocation, handleEventChoice, saveGame, resetGame } = useGameLoop();
  const { activeEventId, resources, time } = gameState;
  const activeEvent = activeEventId ? EVENTS.find((event) => event.id === activeEventId) : null;
  const currentLocation = LOCATIONS[gameState.currentLocationId];
  const visibleResourceIds = getVisibleResourceIds(gameState);
  const availableActionIds = getAvailableActionsAtLocation(gameState);

  return (
    <div className="app-shell">
      {activeEvent && (
        <div className="event-backdrop" role="presentation">
          <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-title">
            <p className="eyebrow" id="event-title">机缘 / 变故</p>
            <p className="event-text">
              {typeof activeEvent.text === 'function' ? activeEvent.text(gameState) : activeEvent.text}
            </p>
            <div className="event-actions">
              {activeEvent.choices.map((choice, index) => (
                <button
                  className="choice-button"
                  key={`${activeEvent.id}-${choice.text}`}
                  onClick={() => handleEventChoice(index)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <header className="topbar">
        <div>
          <h1>文字修仙</h1>
          <p className="subtitle">
            第 {time.year} 年 {SEASON_LABELS[time.season]} 第 {time.day} 日
            <span aria-hidden="true"> / </span>
            {formatRealm(gameState)}
          </p>
        </div>
        <div className="save-actions">
          <button className="quiet-button" onClick={saveGame}>保存</button>
          <button
            className="danger-button"
            onClick={() => {
              if (window.confirm('重置将丢失所有进度，确认？')) resetGame();
            }}
          >
            重置
          </button>
        </div>
      </header>

      <main className="game-grid">
        <section className="panel">
          <h2>状态</h2>
          <dl className="resource-list">
            {visibleResourceIds.map((resourceId) => (
              <React.Fragment key={resourceId}>
                <dt>{RESOURCE_LABELS[resourceId]}</dt>
                <dd>{formatResourceValue(resourceId, resources[resourceId])}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>

        <section className="panel action-panel">
          <h2>行动</h2>
          <p className="location-line">所在：{currentLocation?.name ?? '未知'}</p>
          <div className="location-strip" aria-label="地点">
            {Object.values(LOCATIONS).map((location) => (
              <button
                className="location-button"
                key={location.id}
                onClick={() => moveLocation(location.id)}
                disabled={!!activeEventId || location.id === gameState.currentLocationId}
              >
                {location.name}
              </button>
            ))}
          </div>

          <div className="action-list">
            {availableActionIds.length === 0 ? (
              <p className="muted">此地暂时无事可做。</p>
            ) : (
              availableActionIds.map((actionId) => {
                const action = ACTIONS[actionId];
                if (!action) return null;
                return (
                  <button
                    className="action-button"
                    key={actionId}
                    onClick={() => doAction(actionId)}
                    disabled={!!activeEventId}
                  >
                    {action.name}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="panel log-panel">
          <h2>仙途记录</h2>
          <div className="log-scroll" aria-live="polite">
            {logs.map((log, index) => (
              <p key={`${index}-${log}`}>{log}</p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
