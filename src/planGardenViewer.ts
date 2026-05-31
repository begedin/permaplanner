const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

type ViewerGuildPlant = {
  name?: unknown;
  nameOrCultivar?: unknown;
  plantId?: unknown;
  vigor?: unknown;
  condition?: unknown;
  growthPhase?: unknown;
  stage?: unknown;
};

type ViewerGuild = {
  id?: unknown;
  name?: unknown;
  mulchLevel?: unknown;
  note?: unknown;
  plants?: unknown;
};

const phaseLabel: Record<string, string> = {
  sown: 'Sown',
  germinated: 'Germinated',
  transplanted: 'Transplanted',
  young: 'Young',
  established: 'Established',
  producing: 'Producing',
  post_production: 'Post-production',
};

const vigorLabel: Record<number, string> = {
  1: 'Struggling',
  2: 'Stressed',
  3: 'Fair',
  4: 'Healthy',
  5: 'Thriving',
};

const viewerGuilds = (rawGuilds: unknown): ViewerGuild[] =>
  Array.isArray(rawGuilds) ? (rawGuilds as ViewerGuild[]) : [];

const plantsPlainText = (plants: unknown): string => {
  if (!Array.isArray(plants) || plants.length === 0) {
    return '  - (none)';
  }
  return plants
    .map((plantUnknown) => {
      const plant = plantUnknown as ViewerGuildPlant;
      const name =
        typeof plant.name === 'string' && plant.name.trim()
          ? plant.name.trim()
          : typeof plant.nameOrCultivar === 'string' && plant.nameOrCultivar.trim()
            ? plant.nameOrCultivar.trim()
            : typeof plant.plantId === 'string' && plant.plantId.trim()
              ? plant.plantId.trim()
              : '(unknown plant)';
      const vigorNum = Number(plant.vigor);
      let condition = 'unknown';
      if (Number.isFinite(vigorNum) && vigorNum >= 1 && vigorNum <= 5) {
        const rounded = Math.round(vigorNum);
        condition = `${vigorLabel[rounded] ?? 'unknown'} (${rounded}/5)`;
      } else if (typeof plant.condition === 'string' && plant.condition.trim()) {
        condition = plant.condition.trim();
      }
      const stage =
        typeof plant.growthPhase === 'string'
          ? (phaseLabel[plant.growthPhase] ?? plant.growthPhase)
          : typeof plant.stage === 'string' && plant.stage.trim()
            ? plant.stage.trim()
            : 'unknown';
      return [
        `  - ${escapeHtml(name)}`,
        `    - condition: ${escapeHtml(condition)}`,
        `    - stage: ${escapeHtml(stage)}`,
      ].join('\n');
    })
    .join('\n');
};

/** Plain-text guild blocks for the static viewer `<pre>` (HTML-escaped). */
export const buildPlanGardenViewerPlainText = (rawGuilds: unknown): string => {
  const guilds = viewerGuilds(rawGuilds);
  if (guilds.length === 0) {
    return '';
  }

  return guilds
    .map((guild) => {
      const name =
        typeof guild.name === 'string' && guild.name.trim()
          ? guild.name.trim()
          : '(unnamed guild)';
      const mulchNum = Number(guild.mulchLevel);
      const mulch =
        Number.isFinite(mulchNum) && mulchNum >= 1 && mulchNum <= 5
          ? Math.round(mulchNum)
          : 1;
      const note =
        typeof guild.note === 'string' && guild.note.trim()
          ? guild.note.trim()
          : '(none)';
      const id =
        typeof guild.id === 'string' && guild.id.trim() ? guild.id.trim() : 'n/a';

      return [
        escapeHtml(name),
        '',
        `- id: ${escapeHtml(id)}`,
        '- plants:',
        plantsPlainText(guild.plants),
        `- mulch level: ${mulch}/5`,
        `- note: ${escapeHtml(note)}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
};

/** Fill `public/plan-garden-viewer.template.html` placeholders. */
export const renderPlanGardenViewerHtml = (
  template: string,
  gardenFolderSegment: string,
  rawGuilds: unknown,
): string => {
  const guilds = viewerGuilds(rawGuilds);
  const garden = escapeHtml(gardenFolderSegment);
  const content = buildPlanGardenViewerPlainText(rawGuilds) || '(no guilds)';

  return template
    .replaceAll('{{GARDEN}}', garden)
    .replaceAll('{{GUILD_COUNT}}', String(guilds.length))
    .replaceAll('{{GUILD_CONTENT}}', content);
};
