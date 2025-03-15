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
        cultivar: 'apple',
        feature: 'apple',
        feature_tint: null,
        functions: [],
        layers: [],
      },
      scale: 1,
      currentFeature: 'apple',
    },
  });
});
