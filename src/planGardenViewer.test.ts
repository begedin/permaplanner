import { expect, it } from 'vitest';

import {
  buildPlanGardenViewerPlainText,
  renderPlanGardenViewerHtml,
} from './planGardenViewer';

const template = `<!doctype html>
<title>Permaplanner Guilds ({{GARDEN}})</title>
<p>Garden: {{GARDEN}} · Guilds: {{GUILD_COUNT}}</p>
<pre>{{GUILD_CONTENT}}</pre>`;

const sampleGuilds = [
  {
    id: 'g1',
    name: 'Edge guild',
    mulchLevel: 3,
    note: 'North bed',
    plants: [
      {
        name: 'Thai Basil',
        growthPhase: 'young',
        vigor: 4,
      },
    ],
  },
];

it('buildPlanGardenViewerPlainText renders guild name, plants, mulch, and note', () => {
  expect(buildPlanGardenViewerPlainText(sampleGuilds)).toMatch(
    /Edge guild[\s\S]*- plants:[\s\S]*Thai Basil[\s\S]*condition: Healthy \(4\/5\)[\s\S]*stage: Young[\s\S]*mulch level: 3\/5[\s\S]*note: North bed/,
  );
});

it('renderPlanGardenViewerHtml replaces template placeholders', () => {
  const html = renderPlanGardenViewerHtml(template, 'my-garden', sampleGuilds);
  expect(html).toContain('<title>Permaplanner Guilds (my-garden)</title>');
  expect(html).toContain('Garden: my-garden · Guilds: 1');
  expect(html).toContain('Thai Basil');
  expect(html).not.toContain('{{GARDEN}}');
  expect(html).not.toContain('{{GUILD_COUNT}}');
  expect(html).not.toContain('{{GUILD_CONTENT}}');
});

it('renderPlanGardenViewerHtml shows (no guilds) when guild list is empty', () => {
  const html = renderPlanGardenViewerHtml(template, 'empty', []);
  expect(html).toContain('Guilds: 0');
  expect(html).toContain('(no guilds)');
});
