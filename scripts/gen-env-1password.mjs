import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const examplePath = path.join(root, '.env.1password.example');
const outPath = path.join(root, '.env.1password');

const [, , vault, item] = process.argv;

if (!vault || !item) {
  console.error(
    [
      'Usage: node scripts/gen-env-1password.mjs <vault-name-or-id> <item-title-or-item-id>',
      '',
      'Example:',
      '  npm run gen:env:1password -- Permaplanner xqkx3gntzmkuwitd6nb4xajfei',
      '',
      'Writes .env.1password from .env.1password.example (op:// paths only; not committed).',
    ].join('\n'),
  );
  process.exit(1);
}

let template;
try {
  template = readFileSync(examplePath, 'utf8');
} catch (e) {
  console.error(`Could not read ${examplePath}:`, e);
  process.exit(1);
}

const prefix = 'op://__VAULT__/__ITEM__/';
const replacement = `op://${vault}/${item}/`;
if (!template.includes(prefix)) {
  console.error(
    `Template ${path.relative(root, examplePath)} must contain at least one line with ${prefix}…`,
  );
  process.exit(1);
}
const out = template.replaceAll(prefix, replacement);
writeFileSync(outPath, out, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
