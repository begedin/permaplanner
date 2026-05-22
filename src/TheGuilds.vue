<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { LayoutGroup, motion } from 'motion-v';
import { computed } from 'vue';

import GuildCard from './GuildCard.vue';
import GuildTabHeader from './GuildTabHeader.vue';
import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';

const guildListGridStyle = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))',
};

const guildLayoutTransition = {
  layout: { type: 'spring', stiffness: 400, damping: 38 },
} as const;

const garden = useGardenStore();
const { selectedGuildId } = useGuildSelection();

const isMdUp = useMediaQuery('(min-width: 768px)');
const showMobileDetail = computed(() => Boolean(selectedGuildId.value));

const asideMotionStyle = computed((): Record<string, string> => {
  if (!isMdUp.value) {
    return {};
  }
  if (selectedGuildId.value) {
    return { flex: '0 0 20rem', width: '20rem', maxWidth: '20rem' };
  }
  return { flex: '1 1 0%', minWidth: '0' };
});

const detailMotionStyle = computed((): Record<string, string> => {
  if (!isMdUp.value) {
    return {};
  }
  if (selectedGuildId.value) {
    return { flex: '1 1 0%', minWidth: '0' };
  }
  return { flex: '0 0 0%', width: '0%', minWidth: '0', overflow: 'hidden' };
});
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-emerald-50/40">
    <GuildTabHeader title="Guilds" />

    <div
      v-if="garden.guilds.length === 0"
      class="p-4 text-slate-600 text-sm"
    >
      No guilds yet. Click <strong>Add guild</strong> to create one.
    </div>

    <div
      v-else
      class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
    >
      <LayoutGroup>
        <div class="flex flex-1 min-h-0 min-w-0">
          <motion.aside
            layout
            layout-scroll
            :initial="false"
            :layout-dependency="selectedGuildId"
            :transition="guildLayoutTransition"
            class="flex flex-col min-h-0 min-w-0 border-r border-slate-200/80 bg-white/60 w-full md:shrink-0"
            :class="showMobileDetail ? 'hidden md:flex' : 'flex'"
            :style="asideMotionStyle"
            aria-label="Guild list"
          >
            <motion.div
              layout
              :initial="false"
              :layout-dependency="selectedGuildId"
              :transition="guildLayoutTransition"
              class="guild-list flex-1 min-h-0 overflow-y-auto p-2 grid gap-2"
              :class="
                selectedGuildId ? 'guild-list--single-col auto-rows-min' : 'items-stretch'
              "
              :style="guildListGridStyle"
            >
              <motion.div
                v-for="guild in garden.guilds"
                :key="guild.id"
                layout
                :initial="false"
                class="min-w-0"
                :class="{ 'h-full': !selectedGuildId }"
              >
                <ThingBarGuild
                  :id="guild.id"
                  :fill-cell="!selectedGuildId"
                />
              </motion.div>
            </motion.div>
          </motion.aside>

          <motion.section
            layout
            :initial="false"
            :layout-dependency="selectedGuildId"
            :transition="guildLayoutTransition"
            class="min-h-0 min-w-0 flex-col overflow-hidden"
            :class="[showMobileDetail ? 'flex' : 'hidden md:flex']"
            :style="detailMotionStyle"
            aria-label="Guild details"
          >
            <div
              v-if="selectedGuildId"
              class="flex-1 min-h-0 overflow-y-auto p-4"
            >
              <GuildCard
                :guild-id="selectedGuildId"
                context="guilds"
              />
            </div>
          </motion.section>
        </div>
      </LayoutGroup>
    </div>
  </div>
</template>
