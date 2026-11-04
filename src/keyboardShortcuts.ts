export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select')) return true;
  const editable = target.closest('[contenteditable]');
  return editable !== null && editable.getAttribute('contenteditable') !== 'false';
};
