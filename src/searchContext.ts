export const isMacOs = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const searchInputPlaceholder = (isMac = isMacOs()): string => {
  const mod = isMac ? '⌘' : 'Ctrl';
  return `"${mod}+F" or "/" to search`;
};
