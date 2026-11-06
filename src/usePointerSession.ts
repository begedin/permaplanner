import { onScopeDispose } from 'vue';

/** One captured pointer, one commit; all cancellation paths discard the preview. */
export const usePointerSession = () => {
  let dispose: (() => void) | undefined;
  let discard: (() => void) | undefined;
  const cancel = () => {
    const onCancel = discard;
    dispose?.();
    onCancel?.();
  };
  onScopeDispose(cancel);

  const start = (
    event: PointerEvent,
    handlers: {
      update: (event: PointerEvent) => void;
      commit: () => void;
      cancel: () => void;
    },
  ) => {
    if (event.button !== 0) return;
    cancel();
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as Element;
    const controller = new AbortController();
    const { signal } = controller;
    const pointerId = event.pointerId;
    discard = handlers.cancel;
    dispose = () => {
      controller.abort();
      if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
      dispose = undefined;
      discard = undefined;
    };
    target.setPointerCapture?.(pointerId);
    const finish = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      handlers.update(next);
      dispose?.();
      handlers.commit();
    };
    document.addEventListener(
      'pointermove',
      (next) => {
        if (next.pointerId !== pointerId) return;
        if ((next.buttons & 1) === 0) finish(next);
        else handlers.update(next);
      },
      { signal },
    );
    document.addEventListener('pointerup', finish, { signal });
    document.addEventListener(
      'pointercancel',
      (next) => {
        if (next.pointerId === pointerId) cancel();
      },
      { signal },
    );
    target.addEventListener(
      'lostpointercapture',
      (next) => {
        if ('pointerId' in next && next.pointerId === pointerId) cancel();
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (next) => {
        if (next.key === 'Escape') cancel();
      },
      { signal },
    );
    window.addEventListener('blur', cancel, { signal });
    handlers.update(event);
  };

  return { start, cancel };
};
