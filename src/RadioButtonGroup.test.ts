import { cleanup, fireEvent, render, screen, within } from '@testing-library/vue';
import { afterEach, expect, it } from 'vitest';

import RadioButtonGroup from './RadioButtonGroup.vue';

afterEach(cleanup);

it('exposes labeled native radios and preserves numeric values when selecting', async () => {
  const { emitted, rerender } = render(RadioButtonGroup, {
    props: {
      modelValue: 1,
      name: 'size',
      label: 'Size',
      options: [
        { value: 1, label: 'Small' },
        { value: 2, label: 'Large' },
      ],
    },
  });
  const group = within(screen.getByRole('radiogroup', { name: 'Size' }));
  expect(group.getByRole('radio', { name: 'Small' })).toBeChecked();
  await fireEvent.click(group.getByRole('radio', { name: 'Large' }));
  expect(emitted()['update:modelValue']).toEqual([[2]]);
  await rerender({ modelValue: 2 });
  expect(group.getByRole('radio', { name: 'Large' })).toBeChecked();
  expect(group.getByRole('radio', { name: 'Small' })).not.toBeChecked();
  await rerender({ disabled: true });
  for (const radio of group.getAllByRole('radio')) {
    expect(radio).toBeDisabled();
  }
});
