import { Action } from '../../game/types';

import { BASIC_ACTIONS } from './basic';
import { CULTIVATION_ACTIONS } from './cultivation';
import { ALCHEMY_ACTIONS } from './alchemy';
import { SECT_ACTIONS } from './sect';
import { DWELLING_ACTIONS } from './dwelling';
import { EXPLORATION_ACTIONS } from './exploration';
import { BREAKTHROUGH_ACTIONS } from './breakthrough';
import { COMBAT_ACTIONS } from './combat';
import { SOCIAL_ACTIONS } from './social';
import { HIGHREALM_ACTIONS } from './highRealm';

export const ACTIONS: Record<string, Action> = {
  ...BASIC_ACTIONS,
  ...CULTIVATION_ACTIONS,
  ...ALCHEMY_ACTIONS,
  ...SECT_ACTIONS,
  ...DWELLING_ACTIONS,
  ...EXPLORATION_ACTIONS,
  ...BREAKTHROUGH_ACTIONS,
  ...COMBAT_ACTIONS,
  ...SOCIAL_ACTIONS,
  ...HIGHREALM_ACTIONS
};
