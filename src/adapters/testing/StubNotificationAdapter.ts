/**
 * Stub implementation of the NotificationPort interface for testing.
 * This adapter records notifications for later assertion.
 */

import type { NotificationPort, NotificationOptions } from '../../ports/NotificationPort.js';

/**
 * A recorded notification
 */
export interface RecordedNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  options?: NotificationOptions;
  timestamp: number;
}

/**
 * Stub implementation of NotificationPort for testing
 */
export class StubNotificationAdapter implements NotificationPort {
  private notifications: RecordedNotification[] = [];

  info(message: string, options?: NotificationOptions): void {
    this.record('info', message, options);
  }

  success(message: string, options?: NotificationOptions): void {
    this.record('success', message, options);
  }

  warning(message: string, options?: NotificationOptions): void {
    this.record('warning', message, options);
  }

  error(message: string, options?: NotificationOptions): void {
    this.record('error', message, options);
  }

  private record(type: RecordedNotification['type'], message: string, options?: NotificationOptions): void {
    this.notifications.push({
      type,
      message,
      options,
      timestamp: Date.now()
    });
  }

  /**
   * Get all recorded notifications
   */
  getNotifications(): RecordedNotification[] {
    return [...this.notifications];
  }

  /**
   * Get notifications of a specific type
   */
  getNotificationsOfType(type: RecordedNotification['type']): RecordedNotification[] {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Check if a notification with the given message was recorded
   */
  hasNotification(message: string, type?: RecordedNotification['type']): boolean {
    return this.notifications.some(n => 
      n.message.includes(message) && (type === undefined || n.type === type)
    );
  }

  /**
   * Get the last notification
   */
  getLastNotification(): RecordedNotification | null {
    return this.notifications.length > 0 
      ? this.notifications[this.notifications.length - 1] 
      : null;
  }

  /**
   * Clear all recorded notifications
   */
  clear(): void {
    this.notifications = [];
  }
}

