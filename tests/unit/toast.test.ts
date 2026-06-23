// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createToastManager } from '../../public/js/ui/toast';
import type { ToastElements } from '../../public/js/ui/toast';

describe('createToastManager', () => {
  let toastContainer: HTMLElement;
  let loadingSpinner: HTMLElement;
  let errorOverlay: HTMLElement;
  let errorMessage: HTMLElement;
  let elements: ToastElements;

  beforeEach(() => {
    // Enable fake timers for timeout testing
    vi.useFakeTimers();

    // Set up DOM elements
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';

    loadingSpinner = document.createElement('div');
    loadingSpinner.id = 'loading-spinner';

    errorOverlay = document.createElement('div');
    errorOverlay.id = 'error-overlay';
    
    errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorOverlay.appendChild(errorMessage);

    elements = {
      toastContainer,
      loadingSpinner,
      errorOverlay,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('showToast', () => {
    it('appends the right class for default success type', () => {
      const manager = createToastManager(elements);
      manager.showToast('Success message');

      const toast = toastContainer.firstElementChild as HTMLElement;
      expect(toast).toBeTruthy();
      expect(toast.className).toBe('toast toast-success');
      expect(toast.querySelector('.toast-message')?.textContent).toBe('Success message');

      // Fast-forward 10ms to check if 'show' class is added
      vi.advanceTimersByTime(10);
      expect(toast.classList.contains('show')).toBe(true);
    });

    it('appends the right class for error type', () => {
      const manager = createToastManager(elements);
      manager.showToast('Error message', 'error');

      const toast = toastContainer.firstElementChild as HTMLElement;
      expect(toast).toBeTruthy();
      expect(toast.className).toBe('toast toast-error');
      expect(toast.querySelector('.toast-message')?.textContent).toBe('Error message');
    });

    it('removes the toast element after auto-dismiss timeout', () => {
      const manager = createToastManager(elements);
      manager.showToast('Auto dismiss test');

      const toast = toastContainer.firstElementChild as HTMLElement;
      expect(toast).toBeTruthy();
      expect(toastContainer.contains(toast)).toBe(true);

      // Fast-forward past the 3000ms timeout
      vi.advanceTimersByTime(3000);
      // At 3000ms, 'show' is removed, and another setTimeout of 300ms is scheduled to remove the element.
      expect(toast.classList.contains('show')).toBe(false);

      // Fast-forward another 300ms to complete the dismissal
      vi.advanceTimersByTime(300);
      expect(toastContainer.contains(toast)).toBe(false);
      expect(toastContainer.childElementCount).toBe(0);
    });
  });

  describe('showError', () => {
    it('removes hidden from the overlay, updates the message text, and hides loading spinner', () => {
      // Set initial state
      errorOverlay.classList.add('hidden');
      loadingSpinner.classList.remove('hidden');

      const manager = createToastManager(elements);
      manager.showError('Something went wrong');

      expect(errorOverlay.classList.contains('hidden')).toBe(false);
      expect(loadingSpinner.classList.contains('hidden')).toBe(true);
      expect(errorMessage.textContent).toBe('Something went wrong');
    });

    it('uses default message if none is provided', () => {
      const manager = createToastManager(elements);
      manager.showError();

      expect(errorMessage.textContent).toBe('Failed to load albums');
    });
  });

  describe('hideError', () => {
    it('re-adds hidden to the overlay', () => {
      errorOverlay.classList.remove('hidden');

      const manager = createToastManager(elements);
      manager.hideError();

      expect(errorOverlay.classList.contains('hidden')).toBe(true);
    });
  });
});
