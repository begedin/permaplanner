import { createRouter, createWebHistory } from 'vue-router';

import './main.css';
import { createApp } from 'vue';

import App from './App.vue';
import TheGarden from './TheGarden.vue';
import TheGuilds from './TheGuilds.vue';
import ThePlants from './ThePlants.vue';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
app.use(
  createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: '/guilds' },
      { path: '/guilds', name: 'guilds', component: TheGuilds },
      { path: '/guilds/:guildId', name: 'guilds-detail', component: TheGuilds },
      {
        path: '/aerial',
        name: 'aerial',
        component: TheGarden,
        beforeEnter: (to) => {
          const legacy = to.query.guild;
          if (typeof legacy === 'string' && legacy.length > 0) {
            return {
              name: 'aerial-detail',
              params: { guildId: legacy },
              replace: true,
            };
          }
        },
      },
      { path: '/aerial/:guildId', name: 'aerial-detail', component: TheGarden },
      { path: '/garden', redirect: '/aerial' },
      { path: '/plants', component: ThePlants },
      { path: '/:pathMatch(.*)*', redirect: '/guilds' },
    ],
  }),
);
app.mount('#app');
