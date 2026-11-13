import { effectScope, ref } from 'vue';
import { afterEach, expect, it } from 'vitest';
import type { Guild } from './gardenTypes';
import { useGuildLayoutState } from './useGuildLayoutState';

const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
const setup = () => {
  const guild = ref<Guild>({
    id: 'bed',
    name: 'Bed',
    path: [],
    mulchLevel: 1,
    plants: ['a', 'b'].map((id) => ({
      id,
      plantId: 'apple',
      nameOrCultivar: id,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      placed: false,
    })),
  });
  const scope = effectScope();
  scopes.push(scope);
  const layout = scope.run(() => useGuildLayoutState(guild))!;
  return { guild, layout };
};

it('switches from placement to another selection or placement without Escape', () => {
  const { layout } = setup();
  layout.beginPlacement('a');
  expect(layout.selection.value).toEqual({ mode: 'placing', thingId: 'a' });
  layout.selectPlant('b');
  expect(layout.selection.value).toEqual({ mode: 'selected', thingId: 'b' });
  layout.beginPlacement('b');
  layout.cancelPlacement();
  expect(layout.selection.value).toEqual({ mode: 'selected', thingId: 'b' });
  layout.beginPlacement('a');
  layout.deselect();
  expect(layout.selection.value).toEqual({ mode: 'idle' });
});

it('clears deleted individuals and changed guilds but preserves selection across immutable updates', () => {
  const { guild, layout } = setup();
  layout.selectPlant('a');
  guild.value = {
    ...guild.value,
    plants: guild.value.plants.map((thing) => ({ ...thing })),
  };
  expect(layout.selectedThing.value).toMatchObject({ id: 'a' });
  guild.value.plants = guild.value.plants.filter((thing) => thing.id !== 'a');
  expect(layout.selection.value).toEqual({ mode: 'idle' });
  layout.beginPlacement('b');
  guild.value = { ...guild.value, id: 'other' };
  expect(layout.selection.value).toEqual({ mode: 'idle' });
});

it('cannot enter placement for an individual outside the current guild', () => {
  const { layout } = setup();
  layout.beginPlacement('missing');
  expect(layout.selection.value).toEqual({ mode: 'idle' });
  layout.selectPlant('a');
  layout.selectPlant('missing');
  expect(layout.selection.value).toEqual({ mode: 'idle' });
});
