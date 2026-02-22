export interface ModalElements {
  helpModal: HTMLElement | null;
  closeModal: HTMLButtonElement | null;
}

export interface ModalManager {
  openModal(): void;
  closeModal(): void;
}

/**
 * Creates the modal manager for handling help modal interactions
 * @param elements - DOM elements for modal
 * @returns ModalManager
 */
export const createModalManager = (elements: ModalElements): ModalManager => {
  const { helpModal, closeModal } = elements;

  // Track previously focused element for focus management
  let previouslyFocusedElement: Element | null = null;

  /**
   * Trap focus within the modal when Tab is pressed
   * @param e
   */
  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !helpModal) return;

    // Get all focusable elements within the modal
    const focusableElements = helpModal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) return;

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
    if (!helpModal || !closeModal) return;

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
    helpModal.addEventListener("keydown", trapFocus as EventListener);
  };

  const closeModalFn = () => {
    if (!helpModal) return;

    helpModal.classList.remove("show");
    helpModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";

    const header = document.querySelector(".app-header");
    const contentWrapper = document.querySelector(".content-wrapper");
    if (header) header.removeAttribute("inert");
    if (contentWrapper) contentWrapper.removeAttribute("inert");

    // Remove focus trap event listener
    helpModal.removeEventListener("keydown", trapFocus as EventListener);

    // Restore focus to the previously focused element
    if (previouslyFocusedElement && (previouslyFocusedElement as HTMLElement).focus) {
      (previouslyFocusedElement as HTMLElement).focus();
      previouslyFocusedElement = null;
    }
  };

  return {
    openModal,
    closeModal: closeModalFn,
  };
};
