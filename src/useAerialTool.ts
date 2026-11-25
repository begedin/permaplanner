import type { ShapeFeature } from './mapShapeFeatures';
import type { Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { isEditableTarget, useMapShortcutGuard } from './keyboardShortcuts';

const toolDefinitions = [
  { tool: 'select', name: 'Select', key: 'v', icon: 'pointer' },
  { tool: 'draw', brush: 'path', name: 'Path brush', key: 'b', icon: 'edit' },
  { tool: 'draw', brush: 'polygon', name: 'Polygon', key: 'p', icon: 'polygon' },
  { tool: 'draw', brush: 'rectangle', name: 'Bounding box', key: 'r', icon: 'rectangle' },
  { tool: 'move', name: 'Move guild', key: 'm', icon: 'move' },
] as const;

export const aerialTools = toolDefinitions.map((choice) => ({
  ...choice,
  label: `${choice.name} (${choice.key.toUpperCase()})`,
}));

type ToolChoice = (typeof aerialTools)[number];
export type AerialTool = ToolChoice['tool'];
export type DrawingBrush = Extract<ToolChoice, { tool: 'draw' }>['brush'];
export type MapFeature = 'guild' | 'border' | ShapeFeature;
export type DrawingTarget =
  | { feature: 'guild'; id: string }
  | { feature: 'border' | ShapeFeature };
export type DrawingSession = { target: DrawingTarget; brush: DrawingBrush };

type ToolActions = {
  setTool: (tool: AerialTool) => void;
  setBrush: (brush: DrawingBrush) => void;
};

export const activateAerialTool = (choice: ToolChoice, actions: ToolActions) => {
  if (choice.tool === 'draw') actions.setBrush(choice.brush);
  else actions.setTool(choice.tool);
};

export const useAerialToolHotkeys = (
  options: ToolActions & { canUseGuildTools: Ref<boolean> },
) => {
  const mapInputBlocked = useMapShortcutGuard();
  useEventListener(document, 'keydown', (event) => {
    if (
      isEditableTarget(event.target) ||
      mapInputBlocked(event.target) ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    const key = event.key.toLowerCase();
    const choice = aerialTools.find((tool) => tool.key === key);
    if (!choice || (choice.tool === 'move' && !options.canUseGuildTools.value)) return;
    event.preventDefault();
    activateAerialTool(choice, options);
  });
};
