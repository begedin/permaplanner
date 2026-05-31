import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router';
import { watch } from 'vue';

import { speciesIsPlacedInGuilds } from './calendarGardenPlants';
import type { Guild, Plant } from './gardenTypes';
import TheCalendar from './TheCalendar.vue';
import TheGarden from './TheGarden.vue';
import TheGuilds from './TheGuilds.vue';
import ThePlants from './ThePlants.vue';
import { useGardenStore } from './useGardenStore';
import { isRestoringSession } from './usePlanSession';

export const routeNames = {
  guilds: 'guilds',
  guildsDetail: 'guilds-detail',
  aerial: 'aerial',
  aerialDetail: 'aerial-detail',
  plants: 'plants',
  calendar: 'calendar',
  calendarDetail: 'calendar-detail',
} as const;

export const isGuildsRoute = (name: unknown): boolean =>
  name === routeNames.guilds || name === routeNames.guildsDetail;

export const isAerialRoute = (name: unknown): boolean =>
  name === routeNames.aerial || name === routeNames.aerialDetail;

export const isCalendarRoute = (name: unknown): boolean =>
  name === routeNames.calendar || name === routeNames.calendarDetail;

export const routeParam = (params: unknown, key: string): string | undefined => {
  const value = (params as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const selectionRedirect = (
  to: RouteLocationNormalized,
  guilds: readonly Guild[],
  resolvePlant: (id: string) => Plant,
): RouteLocationRaw | undefined => {
  if (isRestoringSession.value) {
    return undefined;
  }

  if (to.name === routeNames.guildsDetail) {
    const guildId = routeParam(to.params, 'guildId');
    if (guildId && !guilds.some((guild) => guild.id === guildId)) {
      return { name: routeNames.guilds };
    }
  }

  if (to.name === routeNames.aerialDetail) {
    const guildId = routeParam(to.params, 'guildId');
    if (guildId && !guilds.some((guild) => guild.id === guildId)) {
      return { name: routeNames.aerial };
    }
  }

  if (to.name === routeNames.calendarDetail) {
    const speciesId = routeParam(to.params, 'speciesId');
    if (speciesId && !speciesIsPlacedInGuilds(guilds, speciesId, resolvePlant)) {
      return { name: routeNames.calendar };
    }
  }

  return undefined;
};

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/guilds' },
  { path: '/guilds', name: routeNames.guilds, component: TheGuilds },
  { path: '/guilds/:guildId', name: routeNames.guildsDetail, component: TheGuilds },
  {
    path: '/aerial',
    name: routeNames.aerial,
    component: TheGarden,
    beforeEnter: (to) => {
      const legacy = to.query.guild;
      if (typeof legacy === 'string' && legacy.length > 0) {
        return {
          name: routeNames.aerialDetail,
          params: { guildId: legacy },
          replace: true,
        };
      }
    },
  },
  { path: '/aerial/:guildId', name: routeNames.aerialDetail, component: TheGarden },
  { path: '/garden', redirect: '/aerial' },
  { path: '/plants', name: routeNames.plants, component: ThePlants },
  { path: '/calendar', name: routeNames.calendar, component: TheCalendar },
  {
    path: '/calendar/:speciesId',
    name: routeNames.calendarDetail,
    component: TheCalendar,
  },
  { path: '/:pathMatch(.*)*', redirect: '/guilds' },
];

export const createAppRouter = (history: RouterHistory = createWebHistory()) => {
  const router = createRouter({ history, routes });

  router.beforeEach((to) => {
    const garden = useGardenStore();
    return selectionRedirect(to, garden.guilds, (id) => garden.resolvedPlant(id)) ?? true;
  });

  watch(isRestoringSession, async (restoring, wasRestoring) => {
    if (wasRestoring && !restoring) {
      const garden = useGardenStore();
      const redirect = selectionRedirect(router.currentRoute.value, garden.guilds, (id) =>
        garden.resolvedPlant(id),
      );
      if (redirect) {
        await router.replace(redirect);
      }
    }
  });

  return router;
};
