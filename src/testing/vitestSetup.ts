import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine or resize notifications.
window.ResizeObserver = class implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
