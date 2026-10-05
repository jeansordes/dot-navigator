import type { RenderLifetime } from './renderLifetime';
import { setIcon } from 'obsidian';
export function createIconButton(
  parent: HTMLElement,
  icon: string,
  onClick: () => void,
  disabled = false,
  lifetime?: RenderLifetime
): HTMLButtonElement {
  const btn = parent.createEl('button', {
    cls: 'clickable-icon dotnav-settings-card-action',
    type: 'button',
  });
  setIcon(btn, icon);
  btn.disabled = disabled;
  const listener = (event: MouseEvent): void => {
    event.preventDefault();
    if (!btn.disabled) {
      onClick();
    }
  };
  if (lifetime) lifetime.listen(btn, 'click', listener);
  else btn.addEventListener('click', listener);
  return btn;
}
