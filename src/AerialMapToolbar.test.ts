import { cleanup, render, screen, within } from '@testing-library/vue';
import { afterEach, expect, it } from 'vitest';
import AerialMapToolbar from './AerialMapToolbar.vue';

afterEach(cleanup);

it('visually highlights the selected feature and tool as selection changes', async () => {
  const { rerender } = render(AerialMapToolbar, {
    props: {
      feature: 'guild',
      activeTool: 'select',
      drawingBrush: 'path',
      canUseGuildTools: true,
    },
  });
  const features = within(screen.getByRole('group', { name: 'Feature' }));
  const tools = within(screen.getByRole('toolbar', { name: 'Map tools' }));
  for (const [feature, activeTool, featureName, toolName] of [
    ['guild', 'select', 'guild', 'Select (V)'],
    ['landmark', 'draw', 'landmark', 'Path brush (B)'],
    ['border', 'draw', 'Plot border', 'Path brush (B)'],
    ['guild', 'move', 'guild', 'Move guild (M)'],
  ] as const) {
    await rerender({ feature, activeTool });
    expect(
      features.getByRole('button', { name: featureName, pressed: true }),
    ).toHaveClass('btn-soft-primary');
    expect(tools.getByRole('button', { name: toolName, pressed: true })).toHaveClass(
      'nav-icon-btn-active',
    );
    for (const button of features.getAllByRole('button', { pressed: false })) {
      expect(button).not.toHaveClass('btn-soft-primary');
    }
    for (const button of tools.getAllByRole('button', { pressed: false })) {
      expect(button).not.toHaveClass('nav-icon-btn-active');
    }
  }
});
