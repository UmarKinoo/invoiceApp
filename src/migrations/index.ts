import * as migration_20260217_144713_initial from './20260217_144713_initial';

export const migrations = [
  {
    up: migration_20260217_144713_initial.up,
    down: migration_20260217_144713_initial.down,
    name: '20260217_144713_initial'
  },
];
