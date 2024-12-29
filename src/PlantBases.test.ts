import { mount } from '@vue/test-utils';
import { it } from 'vitest';
import PlantBases from './PlantBases.vue';

it('renders without crashing', () => {
  mount(PlantBases, { props: { value: 'bg_1' } });
});
