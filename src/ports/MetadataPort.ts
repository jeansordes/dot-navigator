/**
 * Port interface for metadata operations.
 * This abstracts the Obsidian metadata cache API to allow for testing with in-memory implementations.
 */

/**
 * Represents YAML frontmatter data
 */
export interface FrontmatterData {
  title?: string;
  [key: string]: unknown;
}

/**
 * Abstract interface for metadata operations.
 * Implementations can be Obsidian-based (production) or in-memory (testing).
 */
export interface MetadataPort {
  /**
   * Get the frontmatter data for a file
   */
  getFrontmatter(path: string): FrontmatterData | null;

  /**
   * Get a specific frontmatter field value as unknown
   * Caller should validate the type if needed
   */
  getFrontmatterField(path: string, field: string): unknown;

  /**
   * Get the title from frontmatter (common operation)
   */
  getTitle(path: string): string | null;
}

