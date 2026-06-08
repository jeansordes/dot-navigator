import { setIcon } from 'obsidian';

export function createIconButton(
  parent: HTMLElement,
  icon: string,
  onClick: () => void,
  disabled = false
): HTMLButtonElement {
  const btn = parent.createEl('button', {
    cls: 'clickable-icon dotnav-settings-card-action',
    type: 'button',
  });
  setIcon(btn, icon);
  btn.disabled = disabled;
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    if (!btn.disabled) {
      onClick();
    }
  });
  return btn;
}
