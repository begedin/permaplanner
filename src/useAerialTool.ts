import type { ShapeFeature } from './mapShapeFeatures';
import type { Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { isEditableTarget } from './keyboardShortcuts';

export type DrawingBrush = 'path' | 'polygon' | 'rectangle';
export type MapFeature = 'guild' | 'border' | ShapeFeature;

export type AerialTool = 'select' | 'draw' | 'move';
export type DrawingTarget =
  | { feature: 'guild'; id: string }
  | { feature: 'border' | ShapeFeature };
export type DrawingSession = { target: DrawingTarget; brush: DrawingBrush };

export const useAerialToolHotkeys = (options: {
  canUseGuildTools: Ref<boolean>;
  setTool: (tool: AerialTool) => void;
  setBrush: (brush: DrawingBrush) => void;
}) => {
  useEventListener(document, 'keydown', (e) => {
    if (
      isEditableTarget(e.target) ||
      (e.target instanceof Element && e.target.closest('[role=dialog]'))
    ) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'p') {
      e.preventDefault();
      options.setBrush('polygon');
      return;
    }
    if (key === 'r') {
      e.preventDefault();
      options.setBrush('rectangle');
      return;
    }
    if (key === 'v') {
      e.preventDefault();
      options.setTool('select');
      return;
    }
    if (key === 'b') {
      e.preventDefault();
      options.setBrush('path');
      return;
    }
    if (key === 'm' && options.canUseGuildTools.value) {
      e.preventDefault();
      options.setTool('move');
    }
  });
};
