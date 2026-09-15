<script lang="ts" setup>
  import { toRef } from 'vue';

  import HighlightText from './HighlightText.vue';
  import GuildSeasonStrip from './GuildSeasonStrip.vue';
  import PlantIcon from './PlantIcon.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { useGardenStore } from './useGardenStore';
  import { useGuildCardModel } from './useGuildCardModel';
  import { useGuildSearch } from './useGuildSearch';
  import { useGuildSelection } from './useGuildSelection';

  const props = defineProps<{
    guildId: string;
    /** Stretch to the grid row height in multi-column guild list browse mode. */
    fillCell?: boolean;
  }>();

  const garden = useGardenStore();
  const { selectedGuildId, selectGuild } = useGuildSelection();
  const { searchQuery } = useGuildSearch();
  const {
    guild,
    compactPlantTags,
    placedOnMap,
    guildMapSizeLabel,
    guildMonthPhenologyCounts,
    guildTooltipRows,
    removeFromAerialMap,
  } = useGuildCardModel(toRef(props, 'guildId'));

  const onAerialListClick = () => {
    void selectGuild(props.guildId);
  };

  const onAerialListKeydown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAerialListClick();
    }
  };
</script>

<template>
  <article
    class="flex flex-col gap-1 items-start justify-start p-2 text-ink-600 w-full min-w-0 max-w-full paper-card-interactive"
    :class="{
      'h-full min-h-0': fillCell,
      'paper-card-selected': selectedGuildId === guildId,
      'ring-2 ring-amber-600': garden.mergeSourceId === guildId,
      'paper-card-not-on-aerial': !placedOnMap,
    }"
    :aria-label="guild.name"
    :data-guild-id="guildId"
    :aria-current="selectedGuildId === guildId ? 'true' : undefined"
    tabindex="0"
    @click="onAerialListClick"
    @keydown="onAerialListKeydown"
  >
    <div class="flex flex-row items-start justify-between gap-2 w-full shrink-0">
      <p class="font-medium text-ink-800 min-w-0 flex-1">
        <HighlightText
          :text="guild.name"
          :query="searchQuery"
        />
      </p>
      <div class="flex flex-row items-center shrink-0">
        <span
          v-if="guildMapSizeLabel"
          class="mr-2 text-[11px] leading-tight text-ink-500 tabular-nums"
          aria-label="Guild size on aerial map"
        >
          {{ guildMapSizeLabel }}
        </span>
        <button
          type="button"
          :title="garden.mergeSourceId === guildId ? 'Cancel merge' : 'Merge with'"
          :aria-label="garden.mergeSourceId === guildId ? 'Cancel merge' : 'Merge with'"
          :aria-pressed="garden.mergeSourceId === guildId"
          class="btn-icon inline-flex size-6 shrink-0 items-center justify-center p-0.5 hover:bg-amber-100"
          :class="{ 'bg-amber-100': garden.mergeSourceId === guildId }"
          @click.stop="
            garden.mergeSourceId = garden.mergeSourceId === guildId ? undefined : guildId
          "
        >
          <UiIcon
            :name="garden.mergeSourceId === guildId ? 'remove' : 'merge'"
            class="size-4"
          />
        </button>
        <button
          v-if="placedOnMap"
          type="button"
          title="Remove from aerial map"
          aria-label="Remove from aerial map"
          class="btn-icon inline-flex size-6 shrink-0 items-center justify-center p-0.5 hover:bg-amber-100"
          @click.stop="removeFromAerialMap"
        >
          <UiIcon
            name="unmap"
            class="size-4"
          />
        </button>
      </div>
    </div>
    <div
      class="flex flex-wrap gap-1 w-full min-w-0 shrink-0"
      aria-label="Plants in this guild"
    >
      <span
        v-for="(tag, i) in compactPlantTags"
        :key="`${tag.label}-${i}`"
        class="inline-flex max-w-full items-center gap-1 text-[11px] leading-tight text-ink-700 paper-chip px-1.5 py-0.5"
      >
        <PlantIcon
          :title="tag.label"
          class="size-3.5 shrink-0"
          :plant="tag.plant"
        />
        <span class="min-w-0 truncate">
          <HighlightText
            :text="tag.label"
            :query="searchQuery"
          /><template v-if="tag.count > 1"> ×{{ tag.count }}</template>
        </span>
      </span>
      <span
        v-if="compactPlantTags.length === 0"
        class="text-xs text-ink-400 italic"
      >
        No plants
      </span>
    </div>

    <p
      v-if="garden.mergeSourceId === guildId"
      class="text-xs text-ink-600"
      role="status"
    >
      Select another guild to merge with.
    </p>

    <GuildSeasonStrip
      :class="{ 'mt-auto': fillCell }"
      :fruiting="guildMonthPhenologyCounts.fruiting"
      :blooming="guildMonthPhenologyCounts.blooming"
      :tooltip-rows="guildTooltipRows"
    />
  </article>
</template>
