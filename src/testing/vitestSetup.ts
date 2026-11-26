import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine or resize notifications.
window.ResizeObserver = class implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom hides closed popovers but does not implement the popover methods.
HTMLElement.prototype.showPopover = function () {
  this.style.display = 'block';
};
HTMLElement.prototype.hidePopover = function () {
  this.style.removeProperty('display');
};

// jsdom does not implement the native dialog lifecycle.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};
