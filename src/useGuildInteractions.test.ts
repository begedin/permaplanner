import { createPinia, setActivePinia } from 'pinia';
import { computed, effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AerialTool } from './useAerialTool';
import { useGuildPathEdit } from './useGuildPathEdit';
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
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
];
const setup = (initialTool: AerialTool) => {
  const svg = createMapSvg();
  const path = ref([...initialPath]);
  const selected = ref(true);
  const tool = ref<AerialTool | undefined>(initialTool);
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const interactions = scope.run(() => ({
    edit: useGuildPathEdit({
      svg: ref(svg),
      guild: computed(() =>
        selected.value && tool.value === 'edit'
          ? {
              id: 'guild',
              name: 'Bed',
              plants: [],
              mulchLevel: 1 as const,
              path: initialPath,
            }
          : undefined,
      ),
      onCommit,
      onCancel,
    }),
    move: useGuildPathMove({ path, selected, tool, onCommit }),
  }))!;
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.addEventListener('pointerdown', interactions.move.onPathPointerDown);
  svg.append(polygon);
  return { ...interactions, path, tool, selected, onCommit, onCancel, polygon, svg };
};

it('removes edit shortcuts when the component scope is disposed during editing', () => {
  const { onCommit, onCancel } = setup('edit');
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
    const { edit, onCommit, onCancel } = setup('edit');
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
  const { edit } = setup('edit');
  for (let i = 0; i < 100; i++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
  expect(edit.brush.value[0]).toEqual({ x: 50, y: 0 });
  for (let i = 0; i < 100; i++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
  expect(edit.brush.value[0]).toEqual({ x: 1, y: 0 });
});

it('disposes and reinstalls shortcuts when changing tools', async () => {
  const { tool, onCommit } = setup('edit');
  tool.value = 'select';
  await nextTick();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).not.toHaveBeenCalled();
  tool.value = 'edit';
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
    expect(path.value).toEqual(initialPath.map(({ x, y }) => ({ x: x + 5, y: y + 7 })));
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
    const { svg, edit, selected, tool, onCommit } = setup('edit');
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
  const { svg, edit, tool, onCommit } = setup('edit');
  svg.dispatchEvent(
    new MouseEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 }),
  );
  document.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, clientY: 50 }));
  expect(edit.path.value).not.toEqual(initialPath);
  expect(onCommit).not.toHaveBeenCalled();
  const preview = [...edit.path.value];
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith('guild', preview);
  tool.value = 'select';
  await nextTick();
  tool.value = 'edit';
  await nextTick();
  expect(edit.path.value).toEqual(initialPath);
});
