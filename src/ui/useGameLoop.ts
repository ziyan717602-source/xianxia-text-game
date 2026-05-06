import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../game/types';
import { createInitialState } from '../game/state';
import { processTick, TICK_INTERVAL_MS } from '../game/tick';
import { checkUnlocks } from '../game/unlock';
import { performAction } from '../game/actions';
import { serializeSave, deserializeSave } from '../storage/save';
import { rollEvent } from '../game/events';
import { EVENTS } from '../content/events';

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

  const addLog = useCallback((msg: string) => {
    if (msg) {
      setLogs((prev) => [...prev, msg].slice(-20)); // keep last 20 logs
    }
  }, []);

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
        if (prev.activeEventId) return prev; // Pause game while event is active

        let next = processTick(prev, TICK_INTERVAL_MS);
        next = checkUnlocks(next);
        
        // Randomly roll event (e.g. 5% chance per tick)
        if (Math.random() < 0.05) {
          const evt = rollEvent(next);
          if (evt) {
            next = { ...next, activeEventId: evt.id };
            // We can't call addLog here directly without causing issues or needing refs, 
            // but we can let the UI display the event.
          }
        }
        
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const doAction = useCallback((actionId: string) => {
    setGameState((prev) => {
      if (prev.activeEventId) return prev; // Prevent actions during events
      const result = performAction(prev, actionId);
      addLog(result.log);
      let nextState = checkUnlocks(result.state);
      
      // Optionally roll event on action (e.g. 10% chance)
      if (result.success && Math.random() < 0.1) {
        const evt = rollEvent(nextState);
        if (evt) {
          nextState = { ...nextState, activeEventId: evt.id };
        }
      }
      
      return nextState;
    });
  }, [addLog]);

  const handleEventChoice = useCallback((choiceIndex: number) => {
    setGameState((prev) => {
      if (!prev.activeEventId) return prev;
      const evt = EVENTS.find(e => e.id === prev.activeEventId);
      if (!evt || !evt.choices[choiceIndex]) {
        return { ...prev, activeEventId: null };
      }
      
      const result = evt.choices[choiceIndex].effect(prev);
      addLog(result.log);
      let nextState = checkUnlocks(result.state);
      nextState = { ...nextState, activeEventId: null };
      return nextState;
    });
  }, [addLog]);

  return {
    gameState,
    logs,
    doAction,
    handleEventChoice,
    saveGame,
    resetGame,
  };
}
