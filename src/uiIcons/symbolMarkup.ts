import type { UiIconId } from './iconIds';

/** Inner SVG for each ui-icon symbol (viewBox 0 0 48 48). */
export const UI_ICON_SYMBOL_INNER: Record<UiIconId, string> = {
  edit: `
    <path d="M30 10 L38 18 L18 38 L8 40 L10 30 Z" />
    <path d="M26 14 L34 22" />
    <path d="M8 40 L14 34" />
  `,
  add: `
    <path d="M24 12 Q23 24 24 36" />
    <path d="M12 24 Q24 23 36 24" />
  `,
  'remove-one': `
    <path d="M12 24 Q24 25 36 24" />
  `,
  remove: `
    <path d="M14 14 Q24 24 34 34" />
    <path d="M34 14 Q24 24 14 34" />
  `,
  trash: `
    <path d="M16 16 L32 16" />
    <path d="M18 16 Q18 12 24 12 Q30 12 30 16" />
    <path fill="#d8c8b0" d="M14 18 L34 18 L32 38 Q30 40 24 40 Q18 40 16 38 Z" />
    <path d="M20 22 L20 34 M24 22 L24 34 M28 22 L28 34" />
  `,
  unmap: `
    <circle cx="24" cy="24" r="14" />
    <path d="M14 24 Q24 25 34 24" />
  `,
  'chevron-down': `
    <path d="M14 18 Q24 30 34 18" />
  `,
  document: `
    <path fill="#e8e0d0" d="M14 8 L30 8 L34 12 L34 40 L14 40 Z" />
    <path d="M30 8 L30 14 L34 14" />
    <path d="M18 20 L30 20 M18 26 L30 26 M18 32 L26 32" />
    <path d="M22 32 L22 38 L18 38" />
  `,
  star: `
    <path fill="currentColor" stroke="currentColor" d="M24 11 L27 21 L38 22 L29 29 L32 39 L24 33 L16 39 L19 29 L10 22 L21 21 Z" />
  `,
  'star-outline': `
    <path fill="none" stroke="currentColor" d="M24 11 L27 21 L38 22 L29 29 L32 39 L24 33 L16 39 L19 29 L10 22 L21 21 Z" />
  `,
  ellipsis: `
    <circle cx="14" cy="24" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="34" cy="24" r="2.5" fill="currentColor" stroke="none" />
  `,
};
