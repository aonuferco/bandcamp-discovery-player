export type ToastType = "success" | "error";

export interface ToastElements {
  toastContainer: HTMLElement | null;
  loadingSpinner: HTMLElement | null;
  errorOverlay: HTMLElement | null;
}

export interface ToastManager {
  showToast(message: string, type?: ToastType): void;
  showError(message?: string): void;
  hideError(): void;
}

/**
 * Creates the toast manager for handling notifications and error display
 * @param elements - DOM elements for toast/error
 * @returns ToastManager
 */
export const createToastManager = (elements: ToastElements): ToastManager => {
  const { toastContainer, loadingSpinner, errorOverlay } = elements;

  /**
   * Show a toast notification
   * @param message - Message to display
   * @param type - Toast type (success or error)
   */
  const showToast = (message: string, type: ToastType = "success") => {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  /**
   * Show the error overlay
   * @param message - Error message to display
   */
  const showError = (message: string = "Failed to load albums") => {
    if (!errorOverlay || !loadingSpinner) return;

    const errorMessage = errorOverlay.querySelector(".error-message");
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    errorOverlay.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
  };

  /**
   * Hide the error overlay
   */
  const hideError = () => {
    if (!errorOverlay) return;
    errorOverlay.classList.add("hidden");
  };

  return {
    showToast,
    showError,
    hideError,
  };
};
