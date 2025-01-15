import { createRouter, createWebHistory } from 'vue-router';

import './main.css';
import { createApp } from 'vue';

import App from './App.vue';
import TheGarden from './TheGarden.vue';
import ThePlants from './ThePlants.vue';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
app.use(
  createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: '/garden' },
      { path: '/garden', component: TheGarden },
      { path: '/plants', component: ThePlants },
      { path: '/:pathMatch(.*)*', redirect: '/garden' },
    ],
  }),
);
app.mount('#app');
