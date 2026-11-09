// Frozen into priv/repo/support/guild-boundaries-v8.cjs for the version 8 migration.
import { readFileSync } from 'node:fs';
import { convertLegacyGuildPath } from '../src/legacyImport/guildPath';

const guilds = JSON.parse(readFileSync(process.argv[2]!, 'utf8'));
process.stdout.write(
  JSON.stringify(
    guilds.map((guild: { path: unknown }) => ({
      ...guild,
      path: convertLegacyGuildPath(guild.path),
    })),
  ),
);
