/** Hand-drawn UI action icons (toolbar / card controls). */
export const UI_ICON_IDS = [
  'edit',
  'add',
  'remove-one',
  'remove',
  'trash',
  'unmap',
  'chevron-down',
  'document',
  'star',
  'star-outline',
] as const;

export type UiIconId = (typeof UI_ICON_IDS)[number];
