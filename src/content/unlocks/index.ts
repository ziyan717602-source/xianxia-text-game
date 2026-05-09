import { CORE_UNLOCKS } from './core';
import { LOCATIONS_UNLOCKS } from './locations';
import { ALCHEMY_UNLOCKS } from './alchemy';
import { SECT_UNLOCKS } from './sect';
import { BREAKTHROUGH_UNLOCKS } from './breakthrough';
import { HIGHREALM_UNLOCKS } from './highRealm';
import type { UnlockRule } from './_types';

export type { UnlockRule } from './_types';

export const UNLOCKS: UnlockRule[] = [
  ...CORE_UNLOCKS,
  ...LOCATIONS_UNLOCKS,
  ...ALCHEMY_UNLOCKS,
  ...SECT_UNLOCKS,
  ...BREAKTHROUGH_UNLOCKS,
  ...HIGHREALM_UNLOCKS
];
