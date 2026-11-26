import { useGuildWorkspaceStore } from './useGuildWorkspaceStore';

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select')) return true;
  const editable = target.closest('[contenteditable]');
  return editable !== null && editable.getAttribute('contenteditable') !== 'false';
};

export const isInDialog = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('dialog, [role="dialog"]') !== null;

export const useMapShortcutGuard = () => {
  const workspace = useGuildWorkspaceStore();
  return (target: EventTarget | null) =>
    workspace.mapVisibility === 'hidden' ||
    isInDialog(target) ||
    (target instanceof Element && target.closest('[data-map-settings]') !== null);
};
