export const searchInputPlaceholder = (
  isMac = typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent),
): string => {
  const mod = isMac ? '⌘' : 'Ctrl';
  return `"${mod}+F" or "/" to search`;
};
