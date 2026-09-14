import type { MenuItemKind, MoreMenuItem } from '../../types';

export function shouldShowFor(item: MoreMenuItem, kind: MenuItemKind): boolean {
  const show = item.showFor && item.showFor.length > 0 ? item.showFor : undefined;
  if (!show) {
    if (item.type === 'builtin') {
      if (item.builtin === 'create-folder') return kind === 'folder';
      return item.builtin === 'create-child' || item.builtin === 'delete' ? true : kind === 'file';
    }
    return kind === 'file';
  }
  return show.includes(kind);
}
