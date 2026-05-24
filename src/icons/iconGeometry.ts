/** Shared 48×48 square canvas for plant and UI sketch icons. */
export const ICON_CANVAS = 48;

/** Scale hand-drawn paths to fill the square (authored with inner margin). */
export const ICON_FILL_SCALE = 1.35;

const ICON_CENTER = ICON_CANVAS / 2;

/** Scale symbol artwork about canvas center. */
export const ICON_SYMBOL_TRANSFORM = `translate(${ICON_CENTER} ${ICON_CENTER}) scale(${ICON_FILL_SCALE}) translate(${-ICON_CENTER} ${-ICON_CENTER})`;
