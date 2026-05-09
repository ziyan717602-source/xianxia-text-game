import { GameState, Realm } from './types';
import { adjustQuality } from './choices';

export type CombatChoice = 'flee' | 'negotiate' | 'fight';

export interface Enemy {
  id: string;
  name: string;
  realm: Realm;
  power: number; // Abstract power value
}

export interface CombatResult {
  state: GameState;
  log: string;
  success: boolean; // True if the player "won" or successfully bypassed
}

// Helper to get abstract player power (can be expanded later with weapons, arts, etc.)
function getPlayerPower(state: GameState): number {
  let power = state.resources.qi * 0.1;
  // Subtract power for wounds
  power -= state.resources.wounds * 2;
  return Math.max(0, power);
}

export function resolveCombatEvent(
  state: GameState, 
  choice: CombatChoice, 
  enemy: Enemy, 
  random?: () => number, // seeded rng should be provided by callers for determinism
): CombatResult {
  let newState = { ...state };
  let log = '';
  let success = false;

  switch (choice) {
    case 'flee':
      // Fleeing is safe but you lose face and get nothing
      log = `你选择了避让${enemy.name}。虽然错失了机缘，但也免去了一场风波。`;
      newState = adjustQuality(newState, 'cowardice', 1);
      success = false;
      break;

    case 'negotiate':
      // Negotiate success depends on coins and fame
      const fame = state.choices.qualities['fame'] || 0;
      const negotiateChance = 0.3 + (fame * 0.05) + (state.resources.coins > 50 ? 0.2 : 0);
      
      if ((random ? random() : 0.5) < negotiateChance) {
        log = `你以言语交涉，${enemy.name}收下了你的几分薄面（或银两），没有动手。`;
        if (state.resources.coins >= 10) {
          newState.resources = { ...newState.resources, coins: newState.resources.coins - 10 };
        }
        success = true;
      } else {
        log = `交涉失败！${enemy.name}不买你的账，直接动手！你仓促应战受了伤。`;
        newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1 };
        success = false;
      }
      break;

    case 'fight':
      const playerPower = getPlayerPower(state);
      // Let's say random roll modifies power by +/- 20%
      const playerRoll = playerPower * (0.8 + (random ? random() : 0.5) * 0.4);
      const enemyRoll = enemy.power * (0.8 + (random ? random() : 0.5) * 0.4);

      if (playerRoll >= enemyRoll) {
        log = `你与${enemy.name}斗法，经过一番周折将其击败。`;
        newState = adjustQuality(newState, 'combat_experience', 1);
        newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
        success = true;
      } else {
        log = `你不敌${enemy.name}，败下阵来，受了不小的伤。`;
        newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 2 };
        newState = adjustQuality(newState, 'combat_defeat', 1);
        success = false;
      }
      break;
  }

  return { state: newState, log, success };
}
