import { mkdirSync, mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('rejects an app icon that is still a Git LFS pointer', async () => {
  using publicDir = mkdtempDisposableSync(join(tmpdir(), 'permaplanner-icons-'));
  mkdirSync(join(publicDir.path, 'icons'));
  writeFileSync(
    join(publicDir.path, 'icons/sprout.png'),
    `version https://git-lfs.github.com/spec/v1\noid sha256:${'1'.repeat(64)}\nsize 192\n`,
  );

  await expect(
    build({ publicDir: publicDir.path, build: { write: false } }),
  ).rejects.toThrow(/sprout\.png.*git lfs pull/);
});
