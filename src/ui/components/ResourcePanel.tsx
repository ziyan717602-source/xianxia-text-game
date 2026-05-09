import React from 'react';
import { GameState } from '../../game/types';
import { getVisibleResourceIds, RESOURCE_LABELS } from '../../game/resources';
import { getAlchemySummary } from '../../game/alchemy';
import { getBreakthroughSummary } from '../../game/breakthrough';
import { getCultivationSummary } from '../../game/cultivation';
import { getDaoPathSummary, calculatePathAffinity, DAO_PATHS } from '../../game/daopath';
import { getDemonLabel } from '../../game/innerDemon';
import { getDwellingAutoIncome } from '../../game/dwelling';
import {
  formatResourceValue,
  SECT_RANK_LABELS,
  DWELLING_LEVEL_NAMES,
  FORMATION_LEVEL_NAMES,
  FOLLOWER_ROLE_LABELS,
  FOLLOWER_TASK_LABELS,
} from '../constants';

interface ResourcePanelProps {
  gameState: GameState;
}

export function ResourcePanel({ gameState }: ResourcePanelProps) {
  const { resources } = gameState;
  const visibleResourceIds = getVisibleResourceIds(gameState);
  const alchemySummary = getAlchemySummary(gameState);
  const breakthroughSummary = getBreakthroughSummary(gameState);
  const cultivationSummary = getCultivationSummary(gameState);
  const daoPathSummary = getDaoPathSummary(gameState);
  const daoPathAffinity = calculatePathAffinity(gameState);
  const hasDaoPath = gameState.daoPath.currentPath !== null;
  const hasSect = gameState.sect.rank !== 'none';
  const hasDwelling = gameState.dwelling.level > 0;
  const hasFollowers = Object.keys(gameState.followers.followers).length > 0;
  const hasKarma = gameState.karma.karmicWeight > 0;
  const hasDemon = gameState.innerDemon.activeDemon !== null;
  const dwellingIncome = getDwellingAutoIncome(gameState);

  return (
    <section className="panel resource-panel">
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
  );
}
