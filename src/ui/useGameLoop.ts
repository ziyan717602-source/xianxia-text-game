import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../game/types';
import { createInitialState, createRng } from '../game/state';
import { processTick, TICK_INTERVAL_MS } from '../game/tick';
import { checkUnlocks } from '../game/unlock';
import { performAction } from '../game/actions';
import { moveToLocation } from '../game/location';
import { applyOrigin, hasSelectedOrigin } from '../game/origins';
import { serializeSave, deserializeSave, extractCreatedAt } from '../storage/save';
import { rollEvent } from '../game/events';
import { EVENTS } from '../content/events';
import { ORIGINS, OriginId } from '../content/origins';

const SAVE_KEY = 'xianxia_save_v1';
const AUTO_SAVE_INTERVAL_MS = 5000;

function loadInitialState(): { state: GameState; createdAt?: number } {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    const createdAt = extractCreatedAt(saved);
    return { state: deserializeSave(saved), createdAt };
  }
  return { state: createInitialState() };
}

export function useGameLoop() {
  const initial = loadInitialState();
  const [gameState, setGameState] = useState<GameState>(() => initial.state);
  const createdAtRef = useRef<number | undefined>(initial.createdAt);
  const [logs, setLogs] = useState<string[]>(['请选择出身。']);

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
    localStorage.setItem(SAVE_KEY, serializeSave(stateRef.current, createdAtRef.current));
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setGameState(createInitialState());
    setLogs(['旧档已去。请选择出身。']);
  }, []);

  const chooseOrigin = useCallback((originId: OriginId) => {
    const origin = ORIGINS[originId];
    if (!origin || !origin.selectable) return;

    setGameState((prev) => hasSelectedOrigin(prev) ? prev : applyOrigin(prev, originId));
    setLogs([origin.log]);
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
        if (!hasSelectedOrigin(prev) || prev.activeEventId || prev.choices.flags.game_over) return prev; // Pause game while event is active or game over

        let next = processTick(prev, TICK_INTERVAL_MS);
        next = checkUnlocks(next);
        
        // Randomly roll event (e.g. 5% chance per tick)
        // Use seeded RNG for deterministic event rolls (save/replay compatible)
        const tickRng = createRng(next.seed, next.time.tick);
        if (tickRng() < 0.05) {
          const evt = rollEvent(next, tickRng);
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
      if (!hasSelectedOrigin(prev) || prev.activeEventId) return prev; // Prevent actions during events
      // Use seeded RNG for deterministic action outcomes and event rolls
      const actionRng = createRng(prev.seed, prev.time.tick);
      const result = performAction(prev, actionId, actionRng);
      addLog(result.log);
      let nextState = checkUnlocks(result.state);
      
      // Optionally roll event on action (e.g. 10% chance)
      // Use the same seeded rng (already advanced past action rolls)
      if (result.success && actionRng() < 0.1) {
        const evt = rollEvent(nextState, actionRng);
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
      
      const result = evt.choices[choiceIndex].effect(prev, createRng(prev.seed, prev.time.tick));
      addLog(result.log);
      let nextState = checkUnlocks(result.state);
      nextState = { ...nextState, activeEventId: null };
      return nextState;
    });
  }, [addLog]);

  const moveLocation = useCallback((locationId: string) => {
    setGameState((prev) => {
      if (!hasSelectedOrigin(prev) || prev.activeEventId) return prev;

      const result = moveToLocation(prev, locationId);
      addLog(result.log);
      return result.state;
    });
  }, [addLog]);

  return {
    gameState,
    logs,
    chooseOrigin,
    doAction,
    moveLocation,
    handleEventChoice,
    saveGame,
    resetGame,
  };
}
