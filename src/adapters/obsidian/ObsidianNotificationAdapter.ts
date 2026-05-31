/**
 * Obsidian implementation of the NotificationPort interface.
 * This adapter wraps the Obsidian Notice API.
 */

import { Notice } from 'obsidian';
import type { NotificationPort, NotificationOptions } from '../../ports/NotificationPort.js';

/**
 * Obsidian-based implementation of NotificationPort
 */
export class ObsidianNotificationAdapter implements NotificationPort {
  info(message: string, options?: NotificationOptions): void {
    new Notice(message, options?.duration);
  }

  success(message: string, options?: NotificationOptions): void {
    // Obsidian doesn't have different notice types, but we could style it differently
    new Notice(`✓ ${message}`, options?.duration);
  }

  warning(message: string, options?: NotificationOptions): void {
    new Notice(`⚠ ${message}`, options?.duration);
  }

  error(message: string, options?: NotificationOptions): void {
    new Notice(`✗ ${message}`, options?.duration);
  }
}

