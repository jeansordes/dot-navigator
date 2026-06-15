/** Read a property from an unknown frontmatter-like object without unsafe member access. */
export function readObjectField(obj: unknown, key: string): unknown {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    return undefined;
  }
  return Reflect.get(obj, key);
}
