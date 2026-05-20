import { afterEach, expect, it, vi } from 'vitest';

import { confirmGuildDeletion } from './confirmGuildDeletion';

afterEach(() => {
  vi.restoreAllMocks();
});

it('asks to delete the named guild', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

  expect(confirmGuildDeletion('Berry guild')).toBe(true);
  expect(confirm).toHaveBeenCalledWith(
    'Delete guild “Berry guild”? This cannot be undone.',
  );
});

it('returns false when the user cancels', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);

  expect(confirmGuildDeletion('Berry guild')).toBe(false);
});
