import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AerialTool } from './useAerialTool';
import { useGuildPathEdit } from './useGuildPathEdit';
import { useGuildPathMove } from './useGuildPathMove';
import { useSceneStore } from './useSceneStore';

let scope: EffectScope;
beforeEach(() => {
  setActivePinia(createPinia());
  useSceneStore();
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
  const path = ref([...initialPath]);
  const selected = ref(true);
  const tool = ref<AerialTool | undefined>(initialTool);
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const interactions = scope.run(() => ({
    edit: useGuildPathEdit({
      path,
      selected,
      tool,
      onCommit,
      onCancel,
      resetPath: () => {
        path.value = [...initialPath];
      },
    }),
    move: useGuildPathMove({ path, selected, tool, onCommit }),
  }))!;
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.addEventListener('pointerdown', interactions.move.onPathPointerDown);
  document.body.append(polygon);
  return { ...interactions, path, tool, selected, onCommit, onCancel, polygon };
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
    const scene = useSceneStore();
    polygon.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    scene.worldX = 5;
    scene.worldY = 7;
    document.dispatchEvent(new MouseEvent('pointermove', { buttons: 1 }));
    expect(path.value).toEqual(initialPath.map(({ x, y }) => ({ x: x + 5, y: y + 7 })));
    if (action === 'dispose') scope.stop();
    else if (action === 'deselect') selected.value = false;
    else tool.value = 'select';
    await nextTick();
    scene.worldX = 20;
    document.dispatchEvent(new MouseEvent('pointermove', { buttons: 1 }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(path.value).toEqual(initialPath);
    expect(onCommit).not.toHaveBeenCalled();
  },
);
