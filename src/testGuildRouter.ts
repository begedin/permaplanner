import { createRouter, createMemoryHistory } from 'vue-router';

export const createGuildTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/guilds',
        name: 'guilds',
        component: { template: '<div />' },
      },
      {
        path: '/guilds/:guildId',
        name: 'guilds-detail',
        component: { template: '<div />' },
      },
      {
        path: '/aerial',
        name: 'aerial',
        component: { template: '<div />' },
      },
      {
        path: '/aerial/:guildId',
        name: 'aerial-detail',
        component: { template: '<div />' },
      },
      {
        path: '/plants',
        name: 'plants',
        component: { template: '<div />' },
      },
    ],
  });
