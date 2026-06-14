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
import PrivacyPolicy from './PrivacyPolicy.vue';
import TheCalendar from './TheCalendar.vue';
import TheGarden from './TheGarden.vue';
import TheGuilds from './TheGuilds.vue';
import TheLegacyImport from './TheLegacyImport.vue';
import TheLogin from './TheLogin.vue';
import ThePlants from './ThePlants.vue';
import TheRegister from './TheRegister.vue';
import { useAuthStore } from './stores/useAuthStore';
import { needsGardenSetup } from './useAuthGate';
import { bootstrapGardenSession, isGardenBootstrapping } from './useGardenSession';
import { useGardenStore } from './useGardenStore';

export const routeNames = {
  login: 'login',
  register: 'register',
  import: 'import',
  guilds: 'guilds',
  guildsDetail: 'guilds-detail',
  aerial: 'aerial',
  aerialDetail: 'aerial-detail',
  plants: 'plants',
  calendar: 'calendar',
  calendarDetail: 'calendar-detail',
  privacy: 'privacy',
} as const;

export const isGuildsRoute = (name: unknown): boolean =>
  name === routeNames.guilds || name === routeNames.guildsDetail;

export const isAerialRoute = (name: unknown): boolean =>
  name === routeNames.aerial || name === routeNames.aerialDetail;

export const routeParam = (params: unknown, key: string): string | undefined => {
  const value = (params as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const publicRouteNames = new Set([
  routeNames.login,
  routeNames.register,
  routeNames.privacy,
]);

const selectionRedirect = (
  to: RouteLocationNormalized,
  guilds: readonly Guild[],
  resolvePlant: (id: string) => Plant,
): RouteLocationRaw | undefined => {
  if (isGardenBootstrapping.value) {
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
  { path: '/login', name: routeNames.login, component: TheLogin },
  { path: '/register', name: routeNames.register, component: TheRegister },
  { path: '/import', name: routeNames.import, component: TheLegacyImport },
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
  { path: '/privacy', name: routeNames.privacy, component: PrivacyPolicy },
  { path: '/:pathMatch(.*)*', redirect: '/guilds' },
];

export const createAppRouter = (history: RouterHistory = createWebHistory()) => {
  const router = createRouter({ history, routes });

  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (auth.bootstrapping) {
      await auth.bootstrap();
    }

    const isPublic = publicRouteNames.has(to.name as typeof routeNames.login);

    if (!auth.user?.totpConfirmed && !isPublic) {
      return { name: routeNames.login, replace: true };
    }

    if (auth.user?.totpConfirmed && isGardenBootstrapping.value) {
      await bootstrapGardenSession();
    }

    if (auth.user?.totpConfirmed && (to.name === routeNames.login || to.name === routeNames.register)) {
      return { name: routeNames.guilds, replace: true };
    }

    if (
      auth.user?.totpConfirmed &&
      needsGardenSetup.value &&
      to.name !== routeNames.import &&
      !isPublic
    ) {
      return { name: routeNames.import, replace: true };
    }

    const garden = useGardenStore();
    return selectionRedirect(to, garden.guilds, (id) => garden.resolvedPlant(id)) ?? true;
  });

  watch(isGardenBootstrapping, async (booting, wasBooting) => {
    if (wasBooting && !booting) {
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
