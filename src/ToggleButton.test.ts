import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, expect, it } from 'vitest';

import ToggleButton from './ToggleButton.vue';

afterEach(cleanup);

it('toggles its model and exposes the pressed state with slotted content', async () => {
  const { emitted, rerender } = render(ToggleButton, {
    props: { modelValue: false },
    slots: { default: 'Show details' },
  });
  const button = screen.getByRole('button', { name: 'Show details' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  await fireEvent.click(button);
  expect(emitted()['update:modelValue']).toEqual([[true]]);
  await rerender({ modelValue: true });
  expect(button).toHaveAttribute('aria-pressed', 'true');
  await fireEvent.click(button);
  expect(emitted()['update:modelValue']).toEqual([[true], [false]]);
  await rerender({ disabled: true });
  expect(button).toBeDisabled();
  button.click();
  expect(emitted()['update:modelValue']).toEqual([[true], [false]]);
});
