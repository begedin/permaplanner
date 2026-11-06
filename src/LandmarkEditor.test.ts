import { createPinia, setActivePinia } from 'pinia';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/vue';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { defineComponent, computed, ref } from 'vue';
import LandmarkEditor from './LandmarkEditor.vue';
import { useLandmarkStore } from './useLandmarkStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

beforeEach(() => setActivePinia(createPinia()));
afterEach(cleanup);

it('names, rotates and deletes a landmark with undo', async () => {
  const store = useLandmarkStore();
  store.save({
    id: 'house',
    name: 'Landmark',
    x: 10,
    y: 20,
    width: 130,
    height: 260,
    rotation: 0,
  });
  const view = render(
    defineComponent({
      components: { LandmarkEditor },
      setup() {
        const selectedId = ref<string | undefined>('house');
        const landmark = computed(() =>
          store.landmarks.find((item) => item.id === selectedId.value),
        );
        const remove = () => {
          store.remove('house');
          selectedId.value = undefined;
        };
        return { landmark, store, remove };
      },
      template:
        '<LandmarkEditor :landmark="landmark" @update="store.save" @remove="remove" />',
    }),
  );
  await fireEvent.change(view.getByLabelText('Landmark name'), {
    target: { value: 'House' },
  });
  await fireEvent.change(view.getByLabelText('Rotation (degrees)'), {
    target: { value: '-45' },
  });
  expect(store.landmarks[0]).toMatchObject({ name: 'House', rotation: 315 });
  expect(view.getByText('1.00 × 2.00 m')).toBeVisible();
  await fireEvent.click(view.getByRole('button', { name: 'Delete landmark' }));
  expect(store.landmarks).toEqual([]);
  usePlanCommandHistory().undo();
  expect(store.landmarks).toMatchObject([{ name: 'House', rotation: 315 }]);
  await waitFor(() => expect(view.queryByRole('group')).not.toBeInTheDocument());
});
