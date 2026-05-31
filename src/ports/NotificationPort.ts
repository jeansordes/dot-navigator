/**
 * Port interface for user notifications.
 * This abstracts the Obsidian Notice API to allow for testing without UI dependencies.
 */

/**
 * Notification options
 */
export interface NotificationOptions {
  /**
   * Duration in milliseconds. If not specified, uses default duration.
   */
  duration?: number;
}

/**
 * Abstract interface for user notifications.
 * Implementations can be Obsidian-based (production) or stub (testing).
 */
export interface NotificationPort {
  /**
   * Show an informational notification
   */
  info(message: string, options?: NotificationOptions): void;

  /**
   * Show a success notification
   */
  success(message: string, options?: NotificationOptions): void;

  /**
   * Show a warning notification
   */
  warning(message: string, options?: NotificationOptions): void;

  /**
   * Show an error notification
   */
  error(message: string, options?: NotificationOptions): void;
}

