/**
 * @typedef {Object} ModalElements
 * @property {HTMLElement | null} helpModal
 * @property {HTMLButtonElement | null} closeModal
 */

/**
 * @typedef {Object} ModalManager
 * @property {() => void} openModal
 * @property {() => void} closeModal
 */

/**
 * Creates the modal manager for handling help modal interactions
 * @param {ModalElements} elements - DOM elements for modal
 * @returns {ModalManager}
 */
export const createModalManager = (elements) => {
  const { helpModal, closeModal } = elements;

  // Track previously focused element for focus management
  /** @type {Element | null} */
  let previouslyFocusedElement = null;

  /**
   * Trap focus within the modal when Tab is pressed
   * @param {KeyboardEvent} e
   */
  const trapFocus = (e) => {
    if (e.key !== "Tab") return;

    // Get all focusable elements within the modal
    const focusableElements = helpModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = /** @type {HTMLElement} */ (focusableElements[0]);
    const lastElement = /** @type {HTMLElement} */ (focusableElements[focusableElements.length - 1]);

    if (e.shiftKey) {
      // Shift + Tab: if on first element, move to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, move to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  const openModal = () => {
    // Store the currently focused element to restore later
    previouslyFocusedElement = document.activeElement;

    helpModal.classList.add("show");
    helpModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const header = document.querySelector(".app-header");
    const contentWrapper = document.querySelector(".content-wrapper");
    if (header) header.setAttribute("inert", "");
    if (contentWrapper) contentWrapper.setAttribute("inert", "");

    // Move focus to the close button
    closeModal.focus();

    // Add focus trap event listener
    helpModal.addEventListener("keydown", trapFocus);
  };

  const closeModalFn = () => {
    helpModal.classList.remove("show");
    helpModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";

    const header = document.querySelector(".app-header");
    const contentWrapper = document.querySelector(".content-wrapper");
    if (header) header.removeAttribute("inert");
    if (contentWrapper) contentWrapper.removeAttribute("inert");

    // Remove focus trap event listener
    helpModal.removeEventListener("keydown", trapFocus);

    // Restore focus to the previously focused element
    if (previouslyFocusedElement && /** @type {HTMLElement} */ (previouslyFocusedElement).focus) {
      /** @type {HTMLElement} */ (previouslyFocusedElement).focus();
      previouslyFocusedElement = null;
    }
  };

  return {
    openModal,
    closeModal: closeModalFn,
  };
};
