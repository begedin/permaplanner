import { effectScope, type EffectScope } from 'vue';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { usePointerSession } from './usePointerSession';

let scope: EffectScope;
beforeEach(() => {
  scope = effectScope();
});
afterEach(() => {
  scope.stop();
  document.body.replaceChildren();
});

const pointer = (target: EventTarget, type: string, pointerId = 1, buttons = 1) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons,
    clientX: 30,
    clientY: 40,
  });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  target.dispatchEvent(event);
};

const setup = () => {
  const target = document.createElement('div');
  document.body.append(target);
  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();
  Object.assign(target, {
    setPointerCapture,
    releasePointerCapture,
    hasPointerCapture: () => true,
  });
  const session = scope.run(usePointerSession)!;
  const handlers = { update: vi.fn(), commit: vi.fn(), cancel: vi.fn() };
  target.addEventListener('pointerdown', (event) => session.start(event, handlers));
  pointer(target, 'pointerdown');
  return { target, handlers, setPointerCapture, releasePointerCapture };
};

it('captures one pointer, ignores others and commits only once on release', () => {
  const { target, handlers, setPointerCapture, releasePointerCapture } = setup();
  pointer(document, 'pointermove', 2);
  pointer(document, 'pointerup', 2, 0);
  pointer(document, 'pointercancel', 2);
  pointer(target, 'lostpointercapture', 2);
  expect(handlers.update).toHaveBeenCalledTimes(1);
  expect(handlers.commit).not.toHaveBeenCalled();
  pointer(document, 'pointerup', 1, 0);
  pointer(document, 'pointerup', 1, 0);
  expect(handlers.commit).toHaveBeenCalledTimes(1);
  expect(handlers.cancel).not.toHaveBeenCalled();
  expect(setPointerCapture).toHaveBeenCalledWith(1);
  expect(releasePointerCapture).toHaveBeenCalledWith(1);
});

it.each(['Escape', 'blur', 'pointercancel', 'lostpointercapture', 'unmount'])(
  'discards the gesture on %s and ignores later release',
  (reason) => {
    const { target, handlers } = setup();
    if (reason === 'Escape')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'pointercancel') pointer(document, 'pointercancel');
    if (reason === 'lostpointercapture') pointer(target, 'lostpointercapture');
    if (reason === 'unmount') scope.stop();
    pointer(document, 'pointerup', 1, 0);
    expect(handlers.cancel).toHaveBeenCalledTimes(1);
    expect(handlers.commit).not.toHaveBeenCalled();
  },
);

it('recovers a release missed outside the document', () => {
  const { handlers } = setup();
  pointer(document, 'pointermove', 1, 0);
  pointer(document, 'pointerup', 1, 0);
  expect(handlers.commit).toHaveBeenCalledTimes(1);
  expect(handlers.cancel).not.toHaveBeenCalled();
});
