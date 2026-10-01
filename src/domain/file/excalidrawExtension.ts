/** Map the compound extension to a single suffix for hierarchy parsing. */
export function hierarchyFilePath(path: string, enabled = true): string {
  return enabled && path.endsWith('.excalidraw.md')
    ? path.slice(0, -'.excalidraw.md'.length) + '.excalidraw'
    : path;
}

export function fileExtension(path: string, enabled = true): string | undefined {
  if (enabled && path.endsWith('.excalidraw.md')) return 'excalidraw.md';
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : undefined;
}
