import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../game/types';
import { createInitialState } from '../game/state';
import { processTick, TICK_INTERVAL_MS } from '../game/tick';
import { checkUnlocks } from '../game/unlock';
import { performAction } from '../game/actions';
import { serializeSave, deserializeSave } from '../storage/save';

const SAVE_KEY = 'xianxia_save_v1';
const AUTO_SAVE_INTERVAL_MS = 5000;

function loadInitialState(): GameState {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    return deserializeSave(saved);
  }
  return createInitialState();
}

export function useGameLoop() {
  const [gameState, setGameState] = useState<GameState>(() => loadInitialState());
  const [logs, setLogs] = useState<string[]>(['你降生于世，凡人庸庸碌碌，而你心向长生。']);

  // We use refs to avoid interval closing over stale state
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Save game manually
  const saveGame = useCallback(() => {
    localStorage.setItem(SAVE_KEY, serializeSave(stateRef.current));
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setGameState(createInitialState());
    setLogs(['前尘往事如烟消散，你重新降生于世。']);
  }, []);

  // Auto-save loop
  useEffect(() => {
    const saveInterval = setInterval(saveGame, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(saveInterval);
  }, [saveGame]);

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
    saveGame,
    resetGame,
  };
}
