import { CORE_EVENTS } from './core';
import { CULTIVATION_EVENTS } from './cultivation';
import { SECT_EVENTS } from './sect';
import { ALCHEMY_EVENTS } from './alchemy';
import { EXPLORATION_EVENTS } from './exploration';
import { COMBAT_EVENTS } from './combat';
import { HIGHREALM_EVENTS } from './highRealm';
import { ActiveEvent, EventChoice } from './_helpers';

export { ActiveEvent, EventChoice } from './_helpers';

export const EVENTS: ActiveEvent[] = [
  ...CORE_EVENTS,
  ...CULTIVATION_EVENTS,
  ...SECT_EVENTS,
  ...ALCHEMY_EVENTS,
  ...EXPLORATION_EVENTS,
  ...COMBAT_EVENTS,
  ...HIGHREALM_EVENTS
];
