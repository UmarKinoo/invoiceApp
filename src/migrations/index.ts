import * as migration_20260217_144713_initial from './20260217_144713_initial';
import * as migration_20260427_104557_add_client_brn_vat from './20260427_104557_add_client_brn_vat';
import * as migration_20260522_143102_add_agent_sessions from './20260522_143102_add_agent_sessions';

export const migrations = [
  {
    up: migration_20260217_144713_initial.up,
    down: migration_20260217_144713_initial.down,
    name: '20260217_144713_initial',
  },
  {
    up: migration_20260427_104557_add_client_brn_vat.up,
    down: migration_20260427_104557_add_client_brn_vat.down,
    name: '20260427_104557_add_client_brn_vat',
  },
  {
    up: migration_20260522_143102_add_agent_sessions.up,
    down: migration_20260522_143102_add_agent_sessions.down,
    name: '20260522_143102_add_agent_sessions'
  },
];
