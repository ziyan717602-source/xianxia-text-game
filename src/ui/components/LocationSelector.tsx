import { GameState } from '../../game/types';
import { LOCATIONS } from '../../content/locations';
import { getVisibleLocations } from '../../game/location';
import { getSecretRealmDef } from '../../game/secretRealm';

interface LocationSelectorProps {
  gameState: GameState;
  onMove: (locationId: string) => void;
}

export function LocationSelector({ gameState, onMove }: LocationSelectorProps) {
  const { activeEventId, currentLocationId } = gameState;
  const currentLocation = LOCATIONS[currentLocationId];
  const isExploring = gameState.secretRealm.activeExploration !== null;

  return (
    <>
      <p className="location-line">所在：{currentLocation?.name ?? '未知'}</p>
      <div className="location-strip" aria-label="地点">
        {getVisibleLocations(gameState).map((location) => (
          <button
            className="location-button"
            key={location.id}
            onClick={() => onMove(location.id)}
            disabled={!!activeEventId || location.id === currentLocationId}
            title={location.id === currentLocationId ? undefined : '需5精元'}
          >
            {location.name}
            {location.id !== currentLocationId && <span style={{fontSize: '0.7em', opacity: 0.6, marginLeft: 2}}>(5精元)</span>}
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
    </>
  );
}
