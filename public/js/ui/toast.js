/**
 * @typedef {"success" | "error"} ToastType
 */

/**
 * @typedef {Object} ToastElements
 * @property {HTMLElement | null} toastContainer
 * @property {HTMLElement | null} loadingSpinner
 * @property {HTMLElement | null} errorOverlay
 */

/**
 * @typedef {Object} ToastManager
 * @property {(message: string, type?: ToastType) => void} showToast
 * @property {(message?: string) => void} showError
 * @property {() => void} hideError
 */

/**
 * Creates the toast manager for handling notifications and error display
 * @param {ToastElements} elements - DOM elements for toast/error
 * @returns {ToastManager}
 */
export const createToastManager = (elements) => {
  const { toastContainer, loadingSpinner, errorOverlay } = elements;

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {ToastType} type - Toast type (success or error)
   */
  const showToast = (message, type = "success") => {
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
   * @param {string} message - Error message to display
   */
  const showError = (message = "Failed to load albums") => {
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
    errorOverlay.classList.add("hidden");
  };

  return {
    showToast,
    showError,
    hideError,
  };
};
