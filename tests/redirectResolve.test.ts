import {
  createVaultLinkpathResolver,
  parseRedirectTarget,
  resolveRedirectTargetPath,
  shouldRewriteRedirectOnRename,
} from '../src/core/redirectStub';
import { createMockFile } from './setup';

describe('shouldRewriteRedirectOnRename', () => {
  it('rewrites vault paths only', () => {
    expect(shouldRewriteRedirectOnRename('notes/old.md')).toBe(true);
    expect(shouldRewriteRedirectOnRename('notes/target')).toBe(true);
    expect(shouldRewriteRedirectOnRename('target')).toBe(false);
    expect(shouldRewriteRedirectOnRename('[[My Note]]')).toBe(false);
  });
});

describe('resolveRedirectTargetPath', () => {
  const files = [
    'notes/target.md',
    'notes/prj.ideas.md',
    'folder/target.md',
    'My Note.md',
  ];

  const fileSet = new Set(files);
  const mockFiles = files.map(path => createMockFile(path));
  const getFile = (path: string) => (fileSet.has(path) ? createMockFile(path) : null);
  const getFiles = () => mockFiles.map(file => ({
    path: file.path,
    basename: file.name.replace(/\.md$/u, ''),
  }));
  const resolveLinkpath = createVaultLinkpathResolver(getFile, getFiles);
  const fileExists = (path: string) => fileSet.has(path);

  it('resolves full vault paths', () => {
    expect(resolveRedirectTargetPath('notes/target.md', 'foo.bar.md', fileExists, resolveLinkpath))
      .toBe('notes/target.md');
  });

  it('resolves paths without extension', () => {
    expect(resolveRedirectTargetPath('notes/target', 'foo.bar.md', fileExists, resolveLinkpath))
      .toBe('notes/target.md');
  });

  it('resolves bare note names via linkpath lookup', () => {
    const bareFiles = ['folder/target.md'];
    const bareSet = new Set(bareFiles);
    const bareMockFiles = bareFiles.map(path => createMockFile(path));
    const bareGetFile = (path: string) => (bareSet.has(path) ? createMockFile(path) : null);
    const bareResolver = createVaultLinkpathResolver(
      bareGetFile,
      () => bareMockFiles.map(file => ({
        path: file.path,
        basename: file.name.replace(/\.md$/u, ''),
      })),
    );
    const bareExists = (path: string) => bareSet.has(path);

    expect(resolveRedirectTargetPath('target.md', 'foo.bar.md', bareExists, bareResolver))
      .toBe('folder/target.md');
  });

  it('resolves parsed wikilink targets', () => {
    const linkpath = parseRedirectTarget('[[My Note]]');
    expect(resolveRedirectTargetPath(linkpath!, 'foo.bar.md', fileExists, resolveLinkpath))
      .toBe('My Note.md');

    const nested = parseRedirectTarget('[[notes/target]]');
    expect(resolveRedirectTargetPath(nested!, 'foo.bar.md', fileExists, resolveLinkpath))
      .toBe('notes/target.md');
  });

  it('resolves dotted Dendron-style names', () => {
    expect(resolveRedirectTargetPath('prj.ideas', 'foo.bar.md', fileExists, resolveLinkpath))
      .toBe('notes/prj.ideas.md');
  });

  it('returns null for unresolvable targets', () => {
    expect(resolveRedirectTargetPath('missing.md', 'foo.bar.md', fileExists, resolveLinkpath))
      .toBeNull();
  });
});
