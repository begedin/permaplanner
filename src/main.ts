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
      { path: '/guilds', component: TheGuilds },
      { path: '/aerial', component: TheGarden },
      { path: '/garden', redirect: '/aerial' },
      { path: '/plants', component: ThePlants },
      { path: '/:pathMatch(.*)*', redirect: '/guilds' },
    ],
  }),
);
app.mount('#app');
