import type { PlantIconId } from '../plantIcons/iconIds';
import { PLANT_ICON_IDS } from '../plantIcons/iconIds';

const isPlantIconId = (v: string): v is PlantIconId =>
  (PLANT_ICON_IDS as readonly string[]).includes(v);

/** v3 plan overrides and legacy rows may still store emoji strings. */
const LEGACY_EMOJI_TO_ICON_ID: Record<string, PlantIconId> = {
  '🌱': 'seedling',
  '🌿': 'leaf-herb',
  '🍎': 'apple',
  '🍐': 'pear',
  '🍑': 'peach',
  '🍒': 'cherry',
  '🍓': 'strawberry',
  '🫐': 'blueberry',
  '🍋': 'lemon',
  '🍊': 'orange',
  '🍌': 'banana',
  '🌰': 'chestnut',
  '🌼': 'flower',
  '🌸': 'flower-blossom',
  '🌺': 'flower-tropical',
  '🪻': 'flower-spike',
  '🌹': 'flower-rose',
  '🏵️': 'flower-rosette',
  '💐': 'bouquet',
  '💜': 'flower-spike',
  '🌳': 'tree',
  '🌲': 'evergreen',
  '🫛': 'pea',
  '🥬': 'lettuce',
  '🧄': 'garlic',
  '🧅': 'onion',
  '🌾': 'grain',
  '🪴': 'potted',
  '🍇': 'grape',
  '🥝': 'kiwi',
  '🌻': 'sunflower',
  '🍁': 'maple',
  '🟣': 'plum',
  '🟠': 'apricot',
};

const legacyEmojiToIconId = (emoji: string): PlantIconId =>
  LEGACY_EMOJI_TO_ICON_ID[emoji] ?? 'seedling';

export const coercePlantIconId = (v: unknown): PlantIconId => {
  if (typeof v === 'string' && isPlantIconId(v)) {
    return v;
  }
  if (typeof v === 'string') {
    return legacyEmojiToIconId(v);
  }
  return 'seedling';
};

const migrateOverrideFields = (raw: unknown): Record<string, unknown> | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const o = { ...(raw as Record<string, unknown>) };
  if ('emoji' in o) {
    const { emoji, ...rest } = o;
    if (typeof emoji === 'string') {
      rest.iconId = legacyEmojiToIconId(emoji);
    }
    return Object.keys(rest).length ? rest : undefined;
  }
  if (typeof o.iconId === 'string') {
    o.iconId = coercePlantIconId(o.iconId);
  }
  return Object.keys(o).length ? o : undefined;
};

const migrateUserPlantRow = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }
  const row = { ...(raw as Record<string, unknown>) };
  row.speciesOverride = migrateOverrideFields(row.speciesOverride);
  row.cultivarOverride = migrateOverrideFields(row.cultivarOverride);
  return row;
};

export const migratePlantsOnDocument = (
  doc: Record<string, unknown>,
): Record<string, unknown> => {
  const plants = doc.plants;
  if (!Array.isArray(plants)) {
    return { ...doc, version: 4 };
  }
  return {
    ...doc,
    version: 4,
    plants: plants.map(migrateUserPlantRow),
  };
};
