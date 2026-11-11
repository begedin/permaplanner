import { createPinia, setActivePinia } from 'pinia';
import { computed, effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AerialTool, DrawingBrush } from './useAerialTool';
import { joinPaths } from './guildPathClip';
import { usePathDrawing } from './usePathDrawing';
import { useGuildPathMove } from './useGuildPathMove';
import { createMapSvg } from './testing/mapSvg';

let scope: EffectScope;
beforeEach(() => {
  setActivePinia(createPinia());
  scope = effectScope();
});
afterEach(() => {
  scope.stop();
  document.body.replaceChildren();
});

const initialPath = [
  [
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
  ],
];
const setup = (initialTool: AerialTool, brush: DrawingBrush = 'path') => {
  const drawingBrush = ref(brush);
  const svg = createMapSvg();
  const path = ref([...initialPath]);
  const selected = ref(true);
  const tool = ref<AerialTool | undefined>(initialTool);
  const onCommit = vi.fn(() => {
    tool.value = 'select';
    return true;
  });
  const onCancel = vi.fn();
  const interactions = scope.run(() => ({
    edit: usePathDrawing({
      drawingBrush,
      svg: ref(svg),
      savedPath: computed(() =>
        selected.value && tool.value === 'draw' ? initialPath : undefined,
      ),
      onCommit,
      onCancel,
    }),
    move: useGuildPathMove({ path, selected, tool, onCommit }),
  }))!;
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.addEventListener('pointerdown', interactions.move.onPathPointerDown);
  svg.append(polygon);
  return {
    ...interactions,
    drawingBrush,
    path,
    tool,
    selected,
    onCommit,
    onCancel,
    polygon,
    svg,
  };
};

it('removes edit shortcuts when the component scope is disposed during editing', () => {
  const { onCommit, onCancel } = setup('draw');
  scope.stop();
  const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
  document.dispatchEvent(enter);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(onCommit).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  expect(enter.defaultPrevented).toBe(false);
});

it.each(['input', 'textarea', 'select', 'contenteditable'])(
  'leaves editing shortcuts to %s controls',
  (tag) => {
    const { edit, onCommit, onCancel } = setup('draw');
    const control = document.createElement(tag === 'contenteditable' ? 'div' : tag);
    if (tag === 'contenteditable') control.setAttribute('contenteditable', 'true');
    document.body.append(control);
    const target =
      tag === 'contenteditable'
        ? control.appendChild(document.createElement('span'))
        : control;
    const before = edit.brush.value;
    for (const key of ['+', '-', 'Enter', 'Escape']) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(edit.brush.value).toEqual(before);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  },
);

it('clamps the brush radius to 1–50', () => {
  const { edit } = setup('draw');
  for (let i = 0; i < 100; i++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
  expect(edit.brush.value[0]).toEqual({ x: 50, y: 0 });
  for (let i = 0; i < 100; i++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
  expect(edit.brush.value[0]).toEqual({ x: 1, y: 0 });
});

it('disposes and reinstalls shortcuts when changing tools', async () => {
  const { tool, onCommit } = setup('draw');
  tool.value = 'select';
  await nextTick();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).not.toHaveBeenCalled();
  tool.value = 'draw';
  await nextTick();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).toHaveBeenCalledTimes(1);
});

it.each(['dispose', 'deselect', 'change tool'])(
  'cancels an unfinished drag on %s and ignores later document events',
  async (action) => {
    const { path, selected, tool, polygon, onCommit } = setup('move');
    polygon.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    document.dispatchEvent(
      new MouseEvent('pointermove', { buttons: 1, clientX: 5, clientY: 7 }),
    );
    expect(path.value).toEqual(
      initialPath.map((polygon) =>
        polygon.map((ring) => ring.map(({ x, y }) => ({ x: x + 5, y: y + 7 }))),
      ),
    );
    if (action === 'dispose') scope.stop();
    else if (action === 'deselect') selected.value = false;
    else tool.value = 'select';
    await nextTick();
    document.dispatchEvent(
      new MouseEvent('pointermove', { buttons: 1, clientX: 5, clientY: 7 }),
    );
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(path.value).toEqual(initialPath);
    expect(onCommit).not.toHaveBeenCalled();
  },
);

it.each(['pointercancel', 'blur', 'deselect', 'change tool', 'dispose'])(
  'discards an unfinished brush stroke on %s',
  async (action) => {
    const { svg, edit, selected, tool, onCommit } = setup('draw');
    svg.dispatchEvent(
      new MouseEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 }),
    );
    document.dispatchEvent(
      new MouseEvent('pointermove', { buttons: 1, clientX: 60, clientY: 60 }),
    );
    expect(edit.stroke.value.length).toBeGreaterThan(0);
    if (action === 'pointercancel')
      document.dispatchEvent(new MouseEvent('pointercancel'));
    else if (action === 'blur') window.dispatchEvent(new Event('blur'));
    else if (action === 'deselect') selected.value = false;
    else if (action === 'change tool') tool.value = 'select';
    else scope.stop();
    await nextTick();
    document.dispatchEvent(new MouseEvent('pointerup', { clientX: 60, clientY: 60 }));
    expect({ path: edit.path.value, stroke: edit.stroke.value }).toEqual({
      path: action === 'deselect' || action === 'change tool' ? [] : initialPath,
      stroke: [],
    });
    expect(onCommit).not.toHaveBeenCalled();
  },
);

it('keeps completed brush strokes local until Enter and discards them when switching tools', async () => {
  const { svg, edit, tool, onCommit } = setup('draw');
  svg.dispatchEvent(
    new MouseEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 }),
  );
  document.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, clientY: 50 }));
  expect(edit.path.value).not.toEqual(initialPath);
  expect(onCommit).not.toHaveBeenCalled();
  const preview = [...edit.path.value];
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith(preview);
  tool.value = 'select';
  await nextTick();
  tool.value = 'draw';
  await nextTick();
  expect(edit.path.value).toEqual(initialPath);
});

it.each([
  [100, 65, { x: 100, y: 50 }],
  [65, 100, { x: 50, y: 100 }],
])('locks a Shift stroke to its nearest axis', (clientX, clientY, expected) => {
  const { svg, edit } = setup('draw');
  svg.dispatchEvent(
    new MouseEvent('pointerdown', {
      button: 0,
      clientX: 50,
      clientY: 50,
      shiftKey: true,
    }),
  );
  document.dispatchEvent(
    new MouseEvent('pointermove', { buttons: 1, clientX, clientY, shiftKey: true }),
  );
  expect(edit.pointer.value).toEqual(expected);
  expect(edit.stroke.value).toHaveLength(1);
  document.dispatchEvent(
    new MouseEvent('pointermove', { buttons: 1, clientX: 120, clientY: 120 }),
  );
  expect(edit.pointer.value).toEqual({ x: 120, y: 120 });
});

it('closes a polygon at its first corner, supports Backspace, and discards drafts when changing brushes', async () => {
  const { svg, edit, drawingBrush, onCommit } = setup('draw', 'polygon');
  const click = (clientX: number, clientY: number) =>
    svg.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX, clientY }));
  click(50, 50);
  click(100, 50);
  click(100, 100);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
  expect(edit.corners.value).toEqual([
    { x: 50, y: 50 },
    { x: 100, y: 50 },
  ]);
  drawingBrush.value = 'rectangle';
  await nextTick();
  expect(edit.corners.value).toEqual([]);
  drawingBrush.value = 'polygon';
  await nextTick();
  click(50, 50);
  click(100, 50);
  click(100, 100);
  click(50, 50);
  expect(onCommit).toHaveBeenCalledOnce();
  expect(edit.corners.value).toEqual([]);
});

it('uses the same acceptance contract for polygon closure and Enter', () => {
  const { svg, edit, onCommit } = setup('draw', 'polygon');
  onCommit.mockReturnValueOnce(false);
  for (const [clientX, clientY] of [
    [50, 50],
    [100, 50],
    [100, 100],
    [50, 50],
  ]) {
    svg.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX, clientY }));
  }
  expect(edit.corners.value).toHaveLength(3);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).toHaveBeenCalledTimes(2);
  expect(onCommit.mock.calls[0]).toEqual(onCommit.mock.calls[1]);
  expect(edit.corners.value).toEqual([]);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).toHaveBeenCalledTimes(2);
});

it.each(
  (['path', 'rectangle'] as const).flatMap((brush) =>
    [true, false].map((subtract) => ({ brush, subtract })),
  ),
)(
  'uses the live Command state for the $brush preview and operation (subtract: $subtract)',
  async ({ brush, subtract }) => {
    const { svg, edit } = setup('draw', brush);
    await nextTick();
    if (!subtract)
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Meta', code: 'MetaLeft', metaKey: true }),
      );
    svg.dispatchEvent(
      new MouseEvent('pointerdown', {
        button: 0,
        clientX: 50,
        clientY: 50,
        metaKey: !subtract,
      }),
    );
    window.dispatchEvent(
      new KeyboardEvent(subtract ? 'keydown' : 'keyup', {
        key: 'Meta',
        code: 'MetaLeft',
        metaKey: subtract,
      }),
    );
    expect(edit.strokeColor.value).toBe(
      subtract ? 'rgba(100, 0, 0, 0.3)' : 'rgba(0, 100, 0, 0.6)',
    );
    document.dispatchEvent(
      new MouseEvent('pointerup', { clientX: 70, clientY: 70, metaKey: subtract }),
    );
    if (subtract) expect(edit.path.value).toEqual(joinPaths([], initialPath));
    else expect(edit.path.value).toHaveLength(2);
  },
);
