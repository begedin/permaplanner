import { mount } from '@vue/test-utils';
import { it } from 'vitest';

import PlantCanvas from './PlantCanvas.vue';

it('renders without crashing', () => {
  mount(PlantCanvas, {
    props: {
      plant: {
        id: '1',
        name: 'Base 1',
        background: 'bg_1',
        features: [],
        functions: [],
        layers: [],
      },
      scale: 1,
      currentFeature: 'apple',
    },
  });
});
