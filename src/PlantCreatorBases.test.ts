import { mount } from '@vue/test-utils';
import { it } from 'vitest';
import PlantCreatorBases from './PlantCreatorBases.vue';

it('renders without crashing', () => {
  mount(PlantCreatorBases, { props: { value: 'bg_1' } });
});
