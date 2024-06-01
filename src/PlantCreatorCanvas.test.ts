import { mount } from '@vue/test-utils';
import { it } from 'vitest';

import PlantCreatorCanvas from './PlantCreatorCanvas.vue';

it('renders without crashing', () => {
  mount(PlantCreatorCanvas, {
    props: {
      plant: {
        id: '1',
        name: 'Base 1',
        background: 'bg_1',
        features: [],
      },
      scale: 1,
      currentFeature: 'apple',
    },
  });
});
