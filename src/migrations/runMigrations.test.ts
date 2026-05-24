import { expect, it, vi } from 'vitest';

import { planMigrationLoaders } from './plan/loaders';
import { runMigrations } from './runMigrations';

it('runMigrations dynamically imports only steps needed for the source version', async () => {
  const v0Spy = vi.fn(planMigrationLoaders[0]!);
  const v1Spy = vi.fn(planMigrationLoaders[1]!);
  const v2Spy = vi.fn(planMigrationLoaders[2]!);
  const v3Spy = vi.fn(planMigrationLoaders[3]!);
  const loaders = { 0: v0Spy, 1: v1Spy, 2: v2Spy, 3: v3Spy };

  await runMigrations({ plants: [], guilds: [] }, { loaders, label: 'plan document' });

  expect(v0Spy).toHaveBeenCalledOnce();
  expect(v1Spy).toHaveBeenCalledOnce();
  expect(v2Spy).toHaveBeenCalledOnce();
  expect(v3Spy).toHaveBeenCalledOnce();
});

it('runMigrations skips loaders when document is already current', async () => {
  const v0Spy = vi.fn(planMigrationLoaders[0]!);
  const loaders = {
    0: v0Spy,
    1: planMigrationLoaders[1]!,
    2: planMigrationLoaders[2]!,
    3: planMigrationLoaders[3]!,
  };

  await runMigrations(
    { version: 4, plants: [], guilds: [], guildLocations: [] },
    { loaders, label: 'plan document' },
  );

  expect(v0Spy).not.toHaveBeenCalled();
});
