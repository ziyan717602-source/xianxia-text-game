import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../game/types';
import { createInitialState } from '../game/state';
import { processTick, TICK_INTERVAL_MS } from '../game/tick';
import { checkUnlocks } from '../game/unlock';
import { performAction } from '../game/actions';

export function useGameLoop() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [logs, setLogs] = useState<string[]>(['你降生于世，凡人庸庸碌碌，而你心向长生。']);

  // We use refs to avoid interval closing over stale state
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Game tick loop
  useEffect(() => {
    const intervalId = setInterval(() => {
      setGameState((prev) => {
        let next = processTick(prev, TICK_INTERVAL_MS);
        next = checkUnlocks(next);
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const addLog = useCallback((msg: string) => {
    if (msg) {
      setLogs((prev) => [...prev, msg].slice(-20)); // keep last 20 logs
    }
  }, []);

  const doAction = useCallback((actionId: string) => {
    setGameState((prev) => {
      const result = performAction(prev, actionId);
      addLog(result.log);
      let nextState = checkUnlocks(result.state);
      return nextState;
    });
  }, [addLog]);

  return {
    gameState,
    logs,
    doAction,
  };
}
