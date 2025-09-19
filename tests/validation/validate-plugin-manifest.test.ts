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

    // Required fields validation
    const requiredFields = ['id', 'name', 'description', 'author', 'version', 'minAppVersion', 'isDesktopOnly'];
    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(manifest, field)) {
        this.addError(`manifest.json is missing required field: ${field}`);
      }
    }

    // Allowed fields validation
    const allowedFields = [...requiredFields, 'authorUrl', 'fundingUrl', 'helpUrl'];
    for (const field of Object.keys(manifest)) {
      if (!allowedFields.includes(field)) {
        this.addError(`manifest.json has invalid field: ${field}`);
      }
    }

    // ID validation
    if (manifest.id) {
      if (manifest.id.toLowerCase().includes('obsidian')) {
        this.addError('Plugin ID should not contain "obsidian"');
      }
      if (manifest.id.toLowerCase().endsWith('plugin')) {
        this.addError('Plugin ID should not end with "plugin"');
      }
      if (!/^[a-z0-9-_]+$/.test(manifest.id)) {
        this.addError('Plugin ID must contain only lowercase alphanumeric characters, dashes, and underscores');
      }
    }

    // Name validation
    if (manifest.name) {
      if (manifest.name.toLowerCase().includes('obsidian')) {
        this.addError('Plugin name should not contain "Obsidian"');
      }
      if (manifest.name.toLowerCase().endsWith('plugin')) {
        this.addError('Plugin name should not end with "Plugin"');
      }
      if (manifest.name.toLowerCase().startsWith('obsi') || manifest.name.toLowerCase().endsWith('dian')) {
        this.addError('Plugin name should not contain parts of "Obsidian"');
      }
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

describe('PluginValidator - Manifest Validation', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator('/test/project');
    jest.clearAllMocks();
  });

  it('should error if manifest.json is missing', async () => {
    mockedFs.existsSync.mockReturnValue(false);

    await validator.validateManifest();

    expect(validator.errors).toContain('manifest.json not found at project root');
  });

  it('should error if manifest.json cannot be parsed', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('invalid json');

    await validator.validateManifest();

    expect(validator.errors).toContain('Could not parse manifest.json: Unexpected token \'i\', "invalid json" is not valid JSON');
  });

  it('should validate required fields', async () => {
    const invalidManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      // missing description, author, version, minAppVersion, isDesktopOnly
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidManifest));

    await validator.validateManifest();

    expect(validator.errors).toContain('manifest.json is missing required field: description');
    expect(validator.errors).toContain('manifest.json is missing required field: author');
    expect(validator.errors).toContain('manifest.json is missing required field: version');
    expect(validator.errors).toContain('manifest.json is missing required field: minAppVersion');
    expect(validator.errors).toContain('manifest.json is missing required field: isDesktopOnly');
  });

  it('should validate allowed fields', async () => {
    const manifestWithExtraField = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false,
      invalidField: 'should not be here'
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithExtraField));

    await validator.validateManifest();

    expect(validator.errors).toContain('manifest.json has invalid field: invalidField');
  });

  it('should validate plugin ID format', async () => {
    const manifestWithBadId = {
      id: 'Test_Plugin_With_Obsidian',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithBadId));

    await validator.validateManifest();

    expect(validator.errors).toContain('Plugin ID should not contain "obsidian"');
    expect(validator.errors).toContain('Plugin ID must contain only lowercase alphanumeric characters, dashes, and underscores');
  });

  it('should validate plugin name', async () => {
    const manifestWithBadName = {
      id: 'test-plugin',
      name: 'Obsidian Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      isDesktopOnly: false
    };

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(manifestWithBadName));

    await validator.validateManifest();

    expect(validator.errors).toContain('Plugin name should not contain "Obsidian"');
    expect(validator.errors).toContain('Plugin name should not end with "Plugin"');
  });

});
