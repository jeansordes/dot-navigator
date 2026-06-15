import { setIcon } from 'obsidian';
const ACTION_ICON_MS = 650;

function showToggleActionIcon(toggleEl: HTMLElement, direction: 'expand' | 'collapse'): void {
  const iconName = direction === 'expand' ? 'chevrons-up-down' : 'chevrons-down-up';
  toggleEl.querySelector('.dotn_chevron-action-layer')?.remove();

  const layer = activeDocument.createElement('div');
  layer.className = `dotn_chevron-action-layer dotn_chevron-action-layer--${direction}`;
  setIcon(layer, iconName);
  toggleEl.appendChild(layer);

  const clearLayer = (): void => { layer.remove(); };
  layer.addEventListener('animationend', clearLayer, { once: true });
  window.setTimeout(clearLayer, ACTION_ICON_MS + 100);
}

export function showDoubleClickFeedback(
  direction: 'expand' | 'collapse',
  anchorEl?: HTMLElement
): void {
  if (anchorEl?.instanceOf(HTMLElement) && anchorEl.getAttribute('data-action') === 'toggle') {
    showToggleActionIcon(anchorEl, direction);
  }
}
