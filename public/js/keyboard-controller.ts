/**
 * keyboard-controller.ts
 * Manages keyboard shortcut registration and handling.
 * Uses an event-map pattern for easy extension.
 */

export interface KeyboardHandler {
  /**
   * Register a keyboard shortcut.
   * @param key - The key(s) to listen for (case-insensitive)
   * @param callback - Function to execute when the key is pressed
   * @param options - Optional configuration (e.g., preventDefault)
   */
  registerShortcut(
    key: string,
    callback: () => void,
    options?: { preventDefault?: boolean }
  ): void;

  /**
   * Unregister a previously registered shortcut.
   */
  unregisterShortcut(key: string): void;

  /**
   * Setup the global keydown listener.
   */
  setupListener(): void;

  /**
   * Remove the global keydown listener.
   */
  teardown(): void;
}

/**
 * Creates and returns a KeyboardHandler instance.
 * Maintains an event map of key -> callbacks for easy extension.
 */
export function createKeyboardController(): KeyboardHandler {
  // Map of lowercase key names to their handlers
  const eventMap = new Map<string, {
    callback: () => void;
    preventDefault: boolean;
  }>();

  const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    // Allow Escape to fall through even when an input/textarea is focused.
    // The search input's own keydown listener handles its Escape cleanup independently.
    if ((tag === "input" || tag === "textarea") && e.key !== "Escape") return;

    const key = e.key.toLowerCase();
    const handler = eventMap.get(key);

    if (handler) {
      if (handler.preventDefault) {
        e.preventDefault();
      }
      handler.callback();
    }
  };

  let isSetup = false;

  return {
    registerShortcut(
      key: string,
      callback: () => void,
      options?: { preventDefault?: boolean }
    ): void {
      const normalizedKey = key.toLowerCase();
      eventMap.set(normalizedKey, {
        callback,
        preventDefault: options?.preventDefault ?? false,
      });
    },

    unregisterShortcut(key: string): void {
      eventMap.delete(key.toLowerCase());
    },

    setupListener(): void {
      if (isSetup) return;
      document.addEventListener("keydown", handleKeydown);
      isSetup = true;
    },

    teardown(): void {
      if (!isSetup) return;
      document.removeEventListener("keydown", handleKeydown);
      isSetup = false;
    },
  };
}
