import {
  computed,
  inject,
  readonly,
  shallowRef,
  watch,
  type DeepReadonly,
  type InjectionKey,
  type Ref,
} from 'vue';
import type { Guild } from './gardenTypes';

type LayoutSelection =
  | { mode: 'idle' }
  | { mode: 'selected' | 'placing'; thingId: string };

export const useGuildLayoutState = (guild: Ref<DeepReadonly<Guild> | undefined>) => {
  const selection = shallowRef<LayoutSelection>({ mode: 'idle' });
  const selectedThingId = computed(() =>
    selection.value.mode === 'idle' ? undefined : selection.value.thingId,
  );
  const selectedThing = computed(() =>
    guild.value?.plants.find((thing) => thing.id === selectedThingId.value),
  );
  const placingThingId = computed(() =>
    selection.value.mode === 'placing' ? selection.value.thingId : undefined,
  );
  const deselect = () => {
    selection.value = { mode: 'idle' };
  };
  const selectPlant = (thingId: string | undefined) => {
    selection.value =
      thingId && guild.value?.plants.some((thing) => thing.id === thingId)
        ? { mode: 'selected', thingId }
        : { mode: 'idle' };
  };
  const beginPlacement = (thingId: string) => {
    if (guild.value?.plants.some((thing) => thing.id === thingId))
      selection.value = { mode: 'placing', thingId };
  };
  const cancelPlacement = () => selectPlant(selectedThingId.value);

  watch(() => guild.value?.id, deselect, { flush: 'sync' });
  watch(
    selectedThing,
    (thing) => {
      if (!thing) deselect();
    },
    { flush: 'sync' },
  );

  return {
    guild,
    selection: readonly(selection),
    selectedThingId,
    selectedThing,
    placingThingId,
    selectPlant,
    beginPlacement,
    cancelPlacement,
    deselect,
  };
};

export const guildLayoutKey: InjectionKey<ReturnType<typeof useGuildLayoutState>> =
  Symbol('guild layout');
export const useGuildLayout = () => {
  const layout = inject(guildLayoutKey);
  if (!layout) throw new Error('Guild layout requires the guild workspace');
  return layout;
};
