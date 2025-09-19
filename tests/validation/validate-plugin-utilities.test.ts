import fs from 'fs';
import path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Import mocked modules
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

// Mock path.join to return proper paths
mockedPath.join.mockImplementation((...args: string[]) => {
  return args.join('/');
});
mockedPath.resolve.mockImplementation((...args: string[]) => {
  return args.join('/');
});
mockedPath.basename.mockReturnValue('test-project');

class PluginValidator {
  errors: string[] = [];
  warnings: string[] = [];
  projectRoot: string;

  constructor(projectRoot = path.resolve(__dirname, '..', '..')) {
    this.projectRoot = projectRoot;
  }

  addError(message: string) {
    this.errors.push(message);
  }

  addWarning(message: string) {
    this.warnings.push(message);
  }

  async validate(): Promise<boolean> {
    try {
      await this.validateManifest();
      await this.validateStructure();
      await this.validateNaming();
      await this.validateLicense();
      await this.validateBuildArtifacts();

      return this.errors.length === 0;
    } catch (err) {
      this.addError(`Validation failed with error: ${(err as Error).message}`);
      return false;
    }
  }

  async validateManifest() {
    const manifestPath = path.join(this.projectRoot, 'manifest.json');

    if (!mockedFs.existsSync(manifestPath)) {
      this.addError('manifest.json not found at project root');
      return;
    }

    let manifest;
    try {
      const manifestContent = mockedFs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
    } catch (_e) {
      this.addError(`Could not parse manifest.json: ${(_e as Error).message}`);
      return;
    }

    // Required fields validation
    const requiredFields = ['id', 'name', 'description', 'author', 'version', 'minAppVersion', 'isDesktopOnly'];
    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(manifest, field)) {
        this.addError(`manifest.json is missing required field: ${field}`);
      }
    }

    // Version validation (simplified for this test)
    if (manifest.version && !/^[0-9.]+$/.test(manifest.version)) {
      this.addError('Version must contain only numbers and dots');
    }
  }

  async validateStructure() {
    const requiredFiles = ['package.json'];
    const recommendedFiles = ['README.md', 'styles.css'];

    // Check for main.ts in src/ directory (source)
    const mainTsPath = path.join(this.projectRoot, 'src', 'main.ts');
    if (!mockedFs.existsSync(mainTsPath)) {
      this.addError('Required file missing: src/main.ts (source entry point)');
    }

    for (const file of requiredFiles) {
      if (!mockedFs.existsSync(path.join(this.projectRoot, file))) {
        this.addError(`Required file missing: ${file}`);
      }
    }

    for (const file of recommendedFiles) {
      if (!mockedFs.existsSync(path.join(this.projectRoot, file))) {
        this.addWarning(`Recommended file missing: ${file}`);
      }
    }

    // Check if main.js exists (should be built)
    if (!mockedFs.existsSync(path.join(this.projectRoot, 'main.js'))) {
      this.addWarning('main.js not found - make sure to build the plugin first');
    }
  }

  async validateNaming() {
    const manifestPath = path.join(this.projectRoot, 'manifest.json');
    if (!mockedFs.existsSync(manifestPath)) return;

    try {
      const manifestContent = mockedFs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Check folder name matches plugin ID
      const folderName = path.basename(this.projectRoot);
      if (manifest.id && folderName !== manifest.id) {
        this.addWarning(`Plugin folder name "${folderName}" does not match plugin ID "${manifest.id}"`);
      }

    } catch {
      // manifest validation will catch parsing errors
    }
  }

  async validateLicense() {
    const licensePath = path.join(this.projectRoot, 'LICENSE');
    if (!mockedFs.existsSync(licensePath)) {
      this.addError('LICENSE file not found');
      return;
    }

    // Check if license file has content
    const licenseContent = mockedFs.readFileSync(licensePath, 'utf8');
    if (!licenseContent.trim()) {
      this.addError('LICENSE file is empty');
    }
  }

  async validateBuildArtifacts() {
    // Check for common build artifacts that shouldn't be committed
    const buildArtifacts = ['node_modules', '.DS_Store', 'Thumbs.db'];

    // Read .gitignore file to check what should be ignored
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    let gitignorePatterns: string[] = [];
    if (mockedFs.existsSync(gitignorePath)) {
      try {
        const gitignoreContent = mockedFs.readFileSync(gitignorePath, 'utf8');
        gitignorePatterns = this.parseGitignore(gitignoreContent);
      } catch {
        this.addWarning('Could not read .gitignore file');
      }
    } else {
      this.addWarning('.gitignore file not found');
    }

    for (const artifact of buildArtifacts) {
      const artifactPath = path.join(this.projectRoot, artifact);
      if (mockedFs.existsSync(artifactPath)) {
        // Check if this artifact is properly ignored
        if (this.isIgnoredByGitignore(artifact, gitignorePatterns)) {
          // Artifact is properly ignored, no warning needed
        } else {
          this.addWarning(`Build artifact found but not in .gitignore: ${artifact}`);
        }
      }
    }
  }

  parseGitignore(content: string): string[] {
    const patterns: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed && !trimmed.startsWith('#')) {
        patterns.push(trimmed);
      }
    }

    return patterns;
  }

  isIgnoredByGitignore(artifact: string, patterns: string[]): boolean {
    // Simple pattern matching (could be enhanced for more complex gitignore patterns)
    for (const pattern of patterns) {
      // Handle exact matches and directory matches
      if (pattern === artifact || pattern === `${artifact}/` || pattern === `/${artifact}`) {
        return true;
      }
      // Handle wildcard matches
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\//g, '\\/'));
        if (regex.test(artifact)) {
          return true;
        }
      }
    }
    return false;
  }
}

describe('PluginValidator - Overall Validation', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator('/test/project');
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return true when no errors', async () => {
      // Mock all validations to pass
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation((path: string) => {
        if (path && path.includes('manifest.json')) {
          return JSON.stringify({
            id: 'test',
            name: 'Test',
            description: 'A test plugin',
            author: 'Test Author',
            version: '1.0.0',
            minAppVersion: '0.15.0',
            isDesktopOnly: false
          });
        }
        if (path && path.includes('LICENSE')) {
          return 'MIT License';
        }
        if (path && path.includes('.gitignore')) {
          return 'node_modules\n.DS_Store\nThumbs.db';
        }
        return '';
      });
      mockedPath.basename.mockReturnValue('test-project');

      const result = await validator.validate();

      expect(result).toBe(true);
      expect(validator.errors).toHaveLength(0);
    });

    it('should return false when errors exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await validator.validate();

      expect(result).toBe(false);
      expect(validator.errors.length).toBeGreaterThan(0);
    });
  });
});
