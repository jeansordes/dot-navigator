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

describe('PluginValidator - Structure Validation', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator('/test/project');
    jest.clearAllMocks();
  });

  describe('validateStructure', () => {
    it('should error if main.ts is missing', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('src/main.ts')) return false;
        if (path && path.includes('package.json')) return true;
        if (path && path.includes('README.md')) return true;
        if (path && path.includes('styles.css')) return true;
        if (path && path.includes('main.js')) return true;
        return false;
      });

      await validator.validateStructure();

      expect(validator.errors).toContain('Required file missing: src/main.ts (source entry point)');
    });

    it('should error if package.json is missing', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('src/main.ts')) return true;
        if (path && path.includes('package.json')) return false;
        if (path && path.includes('README.md')) return true;
        if (path && path.includes('styles.css')) return true;
        if (path && path.includes('main.js')) return true;
        return false;
      });

      await validator.validateStructure();

      expect(validator.errors).toContain('Required file missing: package.json');
    });

    it('should warn if README.md is missing', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('src/main.ts')) return true;
        if (path && path.includes('package.json')) return true;
        if (path && path.includes('README.md')) return false;
        if (path && path.includes('styles.css')) return true;
        if (path && path.includes('main.js')) return true;
        return false;
      });

      await validator.validateStructure();

      expect(validator.warnings).toContain('Recommended file missing: README.md');
    });

    it('should warn if styles.css is missing', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('src/main.ts')) return true;
        if (path && path.includes('package.json')) return true;
        if (path && path.includes('README.md')) return true;
        if (path && path.includes('styles.css')) return false;
        if (path && path.includes('main.js')) return true;
        return false;
      });

      await validator.validateStructure();

      expect(validator.warnings).toContain('Recommended file missing: styles.css');
    });

    it('should warn if main.js is missing', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('src/main.ts')) return true;
        if (path && path.includes('package.json')) return true;
        if (path && path.includes('README.md')) return true;
        if (path && path.includes('styles.css')) return true;
        if (path && path.includes('main.js')) return false;
        return false;
      });

      await validator.validateStructure();

      expect(validator.warnings).toContain('main.js not found - make sure to build the plugin first');
    });
  });

  describe('validateNaming', () => {
    it('should warn if folder name does not match plugin ID', async () => {
      const manifest = {
        id: 'different-plugin-id',
        name: 'Test Plugin',
        description: 'A test plugin',
        author: 'Test Author',
        version: '1.0.0',
        minAppVersion: '0.15.0',
        isDesktopOnly: false
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifest));
      mockedPath.basename.mockReturnValue('test-folder-name');

      await validator.validateNaming();

      expect(validator.warnings).toContain('Plugin folder name "test-folder-name" does not match plugin ID "different-plugin-id"');
    });
  });

  describe('validateLicense', () => {
    it('should error if LICENSE file is missing', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await validator.validateLicense();

      expect(validator.errors).toContain('LICENSE file not found');
    });

    it('should error if LICENSE file is empty', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('');

      await validator.validateLicense();

      expect(validator.errors).toContain('LICENSE file is empty');
    });
  });

  describe('validateBuildArtifacts', () => {
    it('should warn if .gitignore is missing', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('.gitignore')) return false;
        return false;
      });

      await validator.validateBuildArtifacts();

      expect(validator.warnings).toContain('.gitignore file not found');
    });

    it('should warn about build artifacts not in gitignore', async () => {
      mockedFs.existsSync.mockImplementation((path: string) => {
        if (path && path.includes('.gitignore')) return true;
        if (path && path.includes('node_modules')) return true;
        return false;
      });

      mockedFs.readFileSync.mockImplementation((path: string) => {
        if (path && path.includes('.gitignore')) {
          return '# Gitignore without node_modules\n.DS_Store';
        }
        return '';
      });

      await validator.validateBuildArtifacts();

      expect(validator.warnings).toContain('Build artifact found but not in .gitignore: node_modules');
    });
  });

  describe('parseGitignore', () => {
    it('should parse gitignore patterns correctly', () => {
      const content = `
# This is a comment
*.log
node_modules/
.DS_Store

# Another comment
dist/
      `;

      const patterns = validator.parseGitignore(content);

      expect(patterns).toEqual(['*.log', 'node_modules/', '.DS_Store', 'dist/']);
    });
  });

  describe('isIgnoredByGitignore', () => {
    it('should match exact patterns', () => {
      const patterns = ['node_modules', 'dist'];

      expect(validator.isIgnoredByGitignore('node_modules', patterns)).toBe(true);
      expect(validator.isIgnoredByGitignore('dist', patterns)).toBe(true);
      expect(validator.isIgnoredByGitignore('src', patterns)).toBe(false);
    });

    it('should match directory patterns', () => {
      const patterns = ['node_modules/'];

      expect(validator.isIgnoredByGitignore('node_modules', patterns)).toBe(true);
    });

    it('should match wildcard patterns', () => {
      const patterns = ['*.log'];

      expect(validator.isIgnoredByGitignore('debug.log', patterns)).toBe(true);
      expect(validator.isIgnoredByGitignore('debug.txt', patterns)).toBe(false);
    });
  });
});
