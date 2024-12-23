import { createRouter, createWebHistory } from 'vue-router';

import './main.css';
import { createApp } from 'vue';

import App from './App.vue';
import ThePermaplanner from './ThePermaplanner.vue';
import ThePlantCreator from './ThePlantCreator.vue';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
app.use(
  createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: ThePermaplanner },
      { path: '/plants', component: ThePlantCreator },
    ],
  }),
);
app.mount('#app');
