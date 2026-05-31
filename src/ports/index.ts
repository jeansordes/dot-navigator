/**
 * Port interfaces for hexagonal architecture.
 * These interfaces define contracts between the domain and infrastructure layers.
 */

export type { VaultPort, FileInfo, FolderInfo } from './VaultPort.js';
export type { MetadataPort, FrontmatterData } from './MetadataPort.js';
export type { NotificationPort, NotificationOptions } from './NotificationPort.js';
export type { WorkspacePort } from './WorkspacePort.js';

