import { App, TFile } from 'obsidian';
import { parseRedirectTarget, REDIRECT_FM_KEY } from "../../core/redirectStub";

/**
 * Reads the YAML title from a file's frontmatter
 * @param app - The Obsidian app instance
 * @param filePath - The path to the file to read
 * @returns The custom title from YAML frontmatter, or null if not found
 */
export function getYamlTitle(app: App, filePath: string): string | null {
  try {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return null;

    const cache = app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;

    return frontmatter?.title || null;
  } catch (error) {
    console.error('Error reading YAML title:', error);
    return null;
  }
}

/**
 * Checks if a file has a YAML custom title
 * @param app - The Obsidian app instance
 * @param filePath - The path to the file to check
 * @returns True if the file has a YAML title, false otherwise
 */
export function hasYamlTitle(app: App, filePath: string): boolean {
  const title = getYamlTitle(app, filePath);
  return title !== null && title.trim() !== '';
}

/**
 * Builds a stable signature from redirect frontmatter for change detection.
 */
export function redirectToSignature(raw: unknown): string {
  return parseRedirectTarget(raw) ?? "";
}

/**
 * Reads normalized redirect target from a file's metadata cache.
 */
export function getYamlRedirectSignature(app: App, filePath: string): string {
  try {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return "";

    const cache = app.metadataCache.getFileCache(file);
    return redirectToSignature(cache?.frontmatter?.[REDIRECT_FM_KEY]);
  } catch (error) {
    console.error("Error reading YAML redirect:", error);
    return "";
  }
}
