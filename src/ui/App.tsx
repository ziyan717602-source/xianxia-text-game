import React, { useState } from 'react';
import { ACTIONS } from '../content/actions';
import { EVENTS } from '../content/events';
import { LOCATIONS } from '../content/locations';
import { SELECTABLE_ORIGINS } from '../content/origins';
import { SECRET_REALMS } from '../content/secretRealms';
import { getAlchemySummary } from '../game/alchemy';
import { getBreakthroughSummary } from '../game/breakthrough';
import { getCultivationSummary } from '../game/cultivation';
import { getDaoPathSummary, getDaoPathLabel, calculatePathAffinity, DAO_PATHS } from '../game/daopath';
import { getDemonLabel } from '../game/innerDemon';
import { getSecretRealmDef } from '../game/secretRealm';
import { getDwellingAutoIncome } from '../game/dwelling';
import { getAvailableActionsAtLocation, getVisibleLocations } from '../game/location';
import { getOriginName, hasSelectedOrigin } from '../game/origins';
import { getVisibleResourceIds, RESOURCE_LABELS, ResourceId } from '../game/resources';
import { DAYS_PER_YEAR, TICKS_PER_DAY } from '../game/state';
import { Action, Realm, Season } from '../game/types';
import { getRecentSummary } from '../game/world';
import { useGameLoop } from './useGameLoop';

const ACTION_GROUP_ORDER: Action['actionGroup'][] = [
  'basic', 'cultivation', 'alchemy', 'sect', 'dwelling', 'exploration', 'breakthrough', 'combat', 'social',
];

const ACTION_GROUP_LABELS: Record<NonNullable<Action['actionGroup']>, string> = {
  basic: '基础',
  cultivation: '修行',
  alchemy: '炼丹',
  sect: '宗门',
  dwelling: '洞府',
  exploration: '探索',
  breakthrough: '突破',
  combat: '斗法',
  social: '交往',
};

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
  [Realm.SpiritTransformation]: '化神',
  [Realm.Integration]: '合体',
  [Realm.Mahayana]: '大乘',
  [Realm.Tribulation]: '渡劫',
};

const SECT_RANK_LABELS: Record<string, string> = {
  none: '',
  outer: '外门弟子',
  inner: '内门弟子',
  core: '核心弟子',
  elder: '长老',
};

const DWELLING_LEVEL_NAMES: Record<number, string> = {
  0: '',
  1: '简陋洞府',
  2: '灵气洞府',
  3: '阵法洞府',
};

const FORMATION_LEVEL_NAMES: Record<number, string> = {
  0: '',
  1: '聚灵阵',
  2: '护法阵',
  3: '洞天阵',
};

const FOLLOWER_ROLE_LABELS: Record<string, string> = {
  servant: '杂役',
  disciple: '弟子',
  guard: '护卫',
};

const FOLLOWER_TASK_LABELS: Record<string, string> = {
  herb_gathering: '采药',
  patrol_duty: '巡值',
  cultivation_aid: '护法',
};

function formatResourceValue(resourceId: ResourceId, value: number) {
  if (resourceId === 'lifespan') {
    return `${Math.floor(value / (DAYS_PER_YEAR * TICKS_PER_DAY))} 年`;
  }
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function formatActionInfo(action: { cost: Partial<Record<string, number>>; output: Partial<Record<string, number>> }): string {
  const parts: string[] = [];
  const costKeys = Object.keys(action.cost);
  const outputKeys = Object.keys(action.output);

  for (const key of costKeys) {
    const val = action.cost[key];
    if (val && val > 0) {
      const label = (RESOURCE_LABELS as Record<string, string>)[key] ?? key;
      parts.push(`耗${val}${label}`);
    }
  }
  for (const key of outputKeys) {
    const val = action.output[key];
    if (val && val > 0 && key !== 'lifespan') {
      const label = (RESOURCE_LABELS as Record<string, string>)[key] ?? key;
      parts.push(`+${val}${label}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : '';
}

function formatRealm(state: { realm: Realm; realmLayer: number }) {
  if (state.realm === Realm.QiCondensation && state.realmLayer > 0) {
    return `${REALM_LABELS[state.realm]}${state.realmLayer}层`;
  }
  if (state.realm === Realm.FoundationEstablishment ||
      state.realm === Realm.GoldenCore ||
      state.realm === Realm.NascentSoul ||
      state.realm === Realm.SpiritTransformation ||
      state.realm === Realm.Integration ||
      state.realm === Realm.Mahayana ||
      state.realm === Realm.Tribulation) {
    const layerLabels = ['初', '中', '后'];
    if (state.realmLayer >= 1 && state.realmLayer <= 3) {
      return `${REALM_LABELS[state.realm]}${layerLabels[state.realmLayer - 1]}期`;
    }
  }
  return REALM_LABELS[state.realm];
}

function ActionGroupSection({ group, label, actions, onAction, disabled, defaultOpen }: {
  group: string;
  label: string;
  actions: Action[];
  onAction: (id: string) => void;
  disabled: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (actions.length === 0) return null;
  return (
    <div className="action-group" data-group={group}>
      <button
        className="action-group-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="action-group-count">{actions.length}</span>
        <span className="action-group-toggle">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="action-group-body">
          {actions.map((action) => (
            <button
              className="action-button"
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={disabled}
            >
              <span>{action.name}</span>
              {formatActionInfo(action) && (
                <span style={{fontSize: '0.75em', opacity: 0.7, display: 'block'}}>{formatActionInfo(action)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function App() {
  const { gameState, logs, chooseOrigin, doAction, moveLocation, handleEventChoice, saveGame, resetGame } = useGameLoop();
  const { activeEventId, resources, time } = gameState;
  const selectedOrigin = hasSelectedOrigin(gameState);
  const activeEvent = activeEventId ? EVENTS.find((event) => event.id === activeEventId) : null;
  const currentLocation = LOCATIONS[gameState.currentLocationId];
  const visibleResourceIds = getVisibleResourceIds(gameState);
  const availableActionIds = getAvailableActionsAtLocation(gameState);
  const alchemySummary = getAlchemySummary(gameState);
  const breakthroughSummary = getBreakthroughSummary(gameState);
  const cultivationSummary = getCultivationSummary(gameState);
  const recentSummary = getRecentSummary(gameState);
  const worldLogs = gameState.world.logs;

  // New system data
  const daoPathSummary = getDaoPathSummary(gameState);
  const daoPathAffinity = calculatePathAffinity(gameState);
  const hasDaoPath = gameState.daoPath.currentPath !== null;
  const hasSect = gameState.sect.rank !== 'none';
  const hasDwelling = gameState.dwelling.level > 0;
  const hasFollowers = Object.keys(gameState.followers.followers).length > 0;
  const isExploring = gameState.secretRealm.activeExploration !== null;
  const hasKarma = gameState.karma.karmicWeight > 0;
  const hasDemon = gameState.innerDemon.activeDemon !== null;
  const isGameOver = Boolean(gameState.choices.flags.game_over);
  const isAscended = gameState.ascension.ascended;
  const dwellingIncome = getDwellingAutoIncome(gameState);

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
        <div className="ascension-overlay" role="presentation">
          <section className="ascension-dialog" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
            <p className="eyebrow" id="gameover-title">
              {gameState.choices.tags.game_over_reason === 'lifespan' ? '寿元已尽' : '伤重不治'}
            </p>
            <p className="event-text">
              {gameState.choices.tags.game_over_reason === 'lifespan'
                ? '气数已尽，此身归于天地。'
                : '伤痕累累，再难撑持。'}
            </p>
            <div className="event-actions">
              <button className="choice-button" onClick={resetGame}>重新开始</button>
            </div>
          </section>
        </div>
      )}

      {isAscended && (
        <div className="ascension-overlay" role="presentation">
          <section className="ascension-dialog" role="dialog" aria-modal="true" aria-labelledby="ascension-title">
            <p className="eyebrow" id="ascension-title">飞升</p>
            <p className="event-text">
              天门已开。此身已非凡躯，修行一程至此。
            </p>
            {gameState.ascension.finalScore !== null && (
              <p className="muted">终分：{gameState.ascension.finalScore}</p>
            )}
          </section>
        </div>
      )}

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
            <span aria-hidden="true"> / </span>
            {getOriginName(gameState)}
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
          {cultivationSummary.length > 0 && (
            <div className="cultivation-block" aria-label="修行">
              <h3>修行</h3>
              {cultivationSummary.map((line, index) => (
                <p key={`${index}-${line}`}>{line}</p>
              ))}
            </div>
          )}
          {alchemySummary.length > 0 && (
            <div className="ledger-block" aria-label="炼丹">
              <h3>炼丹</h3>
              {alchemySummary.map((line, index) => (
                <p key={`${index}-${line}`}>{line}</p>
              ))}
            </div>
          )}
          {breakthroughSummary.length > 0 && (
            <div className="ledger-block" aria-label="突破">
              <h3>突破</h3>
              {breakthroughSummary.map((line, index) => (
                <p key={`${index}-${line}`}>{line}</p>
              ))}
            </div>
          )}
          {hasDaoPath && (
            <div className="ledger-block" aria-label="道途">
              <h3>道途</h3>
              {daoPathSummary.map((line, index) => (
                <p key={`daopath-${index}-${line}`}>{line}</p>
              ))}
              <details>
                <summary>道途亲和</summary>
                {DAO_PATHS.map((path) => (
                  <p key={`affinity-${path.id}`}>
                    {path.label}：{daoPathAffinity[path.id] ?? 0}
                  </p>
                ))}
              </details>
            </div>
          )}
          {hasSect && (
            <div className="ledger-block" aria-label="宗门">
              <h3>宗门</h3>
              <p>身份：{SECT_RANK_LABELS[gameState.sect.rank]}</p>
              <p>贡献：{gameState.sect.contribution}</p>
              <p>规矩：{gameState.sect.discipline}</p>
            </div>
          )}
          {hasDwelling && (
            <div className="ledger-block" aria-label="洞府">
              <h3>洞府</h3>
              <p>{DWELLING_LEVEL_NAMES[gameState.dwelling.level]}</p>
              {gameState.dwelling.formationLevel > 0 && (
                <p>阵法：{FORMATION_LEVEL_NAMES[gameState.dwelling.formationLevel]}</p>
              )}
              {dwellingIncome.qi > 0 && (
                <p>日入：气 +{dwellingIncome.qi}{dwellingIncome.insight > 0 ? `，见闻 +${dwellingIncome.insight}` : ''}</p>
              )}
            </div>
          )}
          {hasFollowers && (
            <div className="ledger-block" aria-label="从属">
              <h3>从属</h3>
              {Object.values(gameState.followers.followers).map((follower) => (
                <p key={follower.id}>
                  {follower.name}（{FOLLOWER_ROLE_LABELS[follower.role] ?? follower.role}）
                  {follower.taskAssignment ? ` — ${FOLLOWER_TASK_LABELS[follower.taskAssignment] ?? follower.taskAssignment}` : ''}
                </p>
              ))}
            </div>
          )}
          {hasKarma && (
            <div className="ledger-block" aria-label="因果">
              <h3>因果</h3>
              <p>因果：{gameState.karma.karmicWeight}</p>
            </div>
          )}
          {hasDemon && (
            <div className="ledger-block demon-warning" aria-label="心魔">
              <h3>心魔</h3>
              <p>{getDemonLabel(gameState.innerDemon.activeDemon!)}</p>
              <div className="progress-bar" role="progressbar" aria-valuenow={gameState.innerDemon.demonProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${gameState.innerDemon.demonProgress}%` }} />
              </div>
            </div>
          )}
        </section>

        <section className="panel action-panel">
          <h2>行动</h2>
          <p className="location-line">所在：{currentLocation?.name ?? '未知'}</p>
          <div className="location-strip" aria-label="地点">
            {getVisibleLocations(gameState).map((location) => (
              <button
                className="location-button"
                key={location.id}
                onClick={() => moveLocation(location.id)}
                disabled={!!activeEventId || location.id === gameState.currentLocationId}
                title={location.id === gameState.currentLocationId ? undefined : '需5精元'}
              >
                {location.name}
                {location.id !== gameState.currentLocationId && <span style={{fontSize: '0.7em', opacity: 0.6, marginLeft: 2}}>(5精元)</span>}
              </button>
            ))}
          </div>

          {isExploring && (
            <div className="exploration-block" aria-label="秘境探索">
              <p>
                正在探索：{getSecretRealmDef(gameState.secretRealm.activeExploration!)?.name ?? '未知秘境'}
              </p>
              <div className="progress-bar" role="progressbar" aria-valuenow={gameState.secretRealm.explorationProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${gameState.secretRealm.explorationProgress}%` }} />
              </div>
              <p className="muted">{Math.floor(gameState.secretRealm.explorationProgress)}%</p>
            </div>
          )}

          <div className="action-list">
            {availableActionIds.length === 0 ? (
              <p className="muted">此地暂时无事可做。</p>
            ) : (
              (() => {
                // Group available actions by actionGroup
                const resolvedActions = availableActionIds
                  .map((id) => ACTIONS[id])
                  .filter((a): a is Action => !!a);
                const grouped = new Map<NonNullable<Action['actionGroup']>, Action[]>();
                const ungrouped: Action[] = [];
                for (const action of resolvedActions) {
                  const g = action.actionGroup;
                  if (g) {
                    if (!grouped.has(g)) grouped.set(g, []);
                    grouped.get(g)!.push(action);
                  } else {
                    ungrouped.push(action);
                  }
                }
                return (
                  <>
                    {ACTION_GROUP_ORDER.map((g) => {
                      if (!g) return null;
                      const actions = grouped.get(g);
                      if (!actions || actions.length === 0) return null;
                      return (
                        <ActionGroupSection
                          key={g}
                          group={g}
                          label={ACTION_GROUP_LABELS[g]}
                          actions={actions}
                          onAction={doAction}
                          disabled={!!activeEventId}
                          defaultOpen={g === 'basic'}
                        />
                      );
                    })}
                    {ungrouped.length > 0 && (
                      <ActionGroupSection
                        group="other"
                        label="其他"
                        actions={ungrouped}
                        onAction={doAction}
                        disabled={!!activeEventId}
                        defaultOpen={false}
                      />
                    )}
                  </>
                );
              })()
            )}
          </div>
        </section>

        <section className="panel log-panel">
          <h2>仙途记录</h2>
          <div className="summary-block" aria-label="近日摘要">
            <h3>近日摘要</h3>
            {recentSummary.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </div>
          <div className="world-block" aria-label="世界日志">
            <h3>世界日志</h3>
            {worldLogs.map((log, index) => (
              <p key={`${index}-${log}`}>{log}</p>
            ))}
          </div>
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
