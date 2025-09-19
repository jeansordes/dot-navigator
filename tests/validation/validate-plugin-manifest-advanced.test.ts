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

interface Manifest {
  id?: string;
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  minAppVersion?: string;
  isDesktopOnly?: boolean;
  authorUrl?: string;
  fundingUrl?: string;
  helpUrl?: string;
}

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

  async validateManifest() {
    const manifestPath = path.join(this.projectRoot, 'manifest.json');

    if (!mockedFs.existsSync(manifestPath)) {
      this.addError('manifest.json not found at project root');
      return;
    }

    let manifest: Manifest;
    try {
      const manifestContent = mockedFs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
    } catch (_e) {
      this.addError(`Could not parse manifest.json: ${(_e as Error).message}`);
      return;
    }

    // Author validation
    if (manifest.author && /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(manifest.author)) {
      this.addWarning('Consider not including email addresses in the author field');
    }

    // Description validation
    if (manifest.description) {
      if (manifest.description.toLowerCase().includes('obsidian')) {
        this.addError('Plugin description should not contain "Obsidian"');
      }
      if (manifest.description.toLowerCase().includes('this plugin') ||
          manifest.description.toLowerCase().includes('this is a plugin') ||
          manifest.description.toLowerCase().includes('this plugin allows')) {
        this.addWarning('Avoid phrases like "This is a plugin that does" in description');
      }
      if (manifest.description.length > 250) {
        this.addError('Plugin description is too long (max 250 characters)');
      }
    }

    // URL validations
    if (manifest.authorUrl) {
      if (manifest.authorUrl === 'https://obsidian.md') {
        this.addError('authorUrl should not point to the Obsidian website');
      }
    }

    if (Object.prototype.hasOwnProperty.call(manifest, 'fundingUrl')) {
      if (manifest.fundingUrl === 'https://obsidian.md/pricing') {
        this.addError('fundingUrl should not point to the Obsidian pricing page');
      }
      if (manifest.fundingUrl === '') {
        this.addError('fundingUrl should be removed if empty, or contain a valid funding link');
      }
    }

    // Version validation
    if (manifest.version && !/^[0-9.]+$/.test(manifest.version)) {
      this.addError('Version must contain only numbers and dots');
    }
  }
}

describe('PluginValidator - Advanced Manifest Validation', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator('/test/project');
    jest.clearAllMocks();
  });

  it('should warn about email addresses in author field', async () => {
    const manifestWithEmail = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'test@example.com',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithEmail));

    await validator.validateManifest();

    expect(validator.warnings).toContain('Consider not including email addresses in the author field');
  });

  it('should validate description content', async () => {
    const manifestWithBadDescription = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'This plugin for Obsidian is amazing. This is a plugin that does things.',
      author: 'Test Author',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithBadDescription));

    await validator.validateManifest();

    expect(validator.errors).toContain('Plugin description should not contain "Obsidian"');
    expect(validator.warnings).toContain('Avoid phrases like "This is a plugin that does" in description');
  });

  it('should validate description length', async () => {
    const longDescription = 'a'.repeat(251);
    const manifestWithLongDescription = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: longDescription,
      author: 'Test Author',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithLongDescription));

    await validator.validateManifest();

    expect(validator.errors).toContain('Plugin description is too long (max 250 characters)');
  });

  it('should validate authorUrl', async () => {
    const manifestWithBadAuthorUrl = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      authorUrl: 'https://obsidian.md',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithBadAuthorUrl));

    await validator.validateManifest();

    expect(validator.errors).toContain('authorUrl should not point to the Obsidian website');
  });

  it('should validate fundingUrl', async () => {
    const manifestWithBadFundingUrl = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      fundingUrl: 'https://obsidian.md/pricing',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithBadFundingUrl));

    await validator.validateManifest();

    expect(validator.errors).toContain('fundingUrl should not point to the Obsidian pricing page');
  });

  it('should error on empty fundingUrl', async () => {
    const manifestWithEmptyFundingUrl = {
      id: 'test',
      name: 'Test',
      description: 'A test plugin',
      author: 'Test Author',
      fundingUrl: '',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithEmptyFundingUrl));

    await validator.validateManifest();

    expect(validator.errors).toContain('fundingUrl should be removed if empty, or contain a valid funding link');
  });

  it('should validate version format', async () => {
    const manifestWithBadVersion = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      version: '1.0.0-alpha',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithBadVersion));

    await validator.validateManifest();

    expect(validator.errors).toContain('Version must contain only numbers and dots');
  });
});
