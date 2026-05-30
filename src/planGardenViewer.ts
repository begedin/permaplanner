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

const plantNameText = (plant: ViewerGuildPlant): string => {
  if (typeof plant.name === 'string' && plant.name.trim()) {
    return plant.name.trim();
  }
  if (typeof plant.nameOrCultivar === 'string' && plant.nameOrCultivar.trim()) {
    return plant.nameOrCultivar.trim();
  }
  if (typeof plant.plantId === 'string' && plant.plantId.trim()) {
    return plant.plantId.trim();
  }
  return '(unknown plant)';
};

const plantConditionText = (plant: ViewerGuildPlant): string => {
  const vigorNum = Number(plant.vigor);
  if (Number.isFinite(vigorNum) && vigorNum >= 1 && vigorNum <= 5) {
    const rounded = Math.round(vigorNum);
    return `${vigorLabel[rounded] ?? 'unknown'} (${rounded}/5)`;
  }
  if (typeof plant.condition === 'string' && plant.condition.trim()) {
    return plant.condition.trim();
  }
  return 'unknown';
};

const plantStageText = (plant: ViewerGuildPlant): string => {
  if (typeof plant.growthPhase === 'string') {
    return phaseLabel[plant.growthPhase] ?? plant.growthPhase;
  }
  if (typeof plant.stage === 'string' && plant.stage.trim()) {
    return plant.stage.trim();
  }
  return 'unknown';
};

const plantsPlainText = (plants: unknown): string => {
  if (!Array.isArray(plants) || plants.length === 0) {
    return '  - (none)';
  }
  return plants
    .map((plantUnknown) => {
      const plant = plantUnknown as ViewerGuildPlant;
      return [
        `  - ${escapeHtml(plantNameText(plant))}`,
        `    - condition: ${escapeHtml(plantConditionText(plant))}`,
        `    - stage: ${escapeHtml(plantStageText(plant))}`,
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
