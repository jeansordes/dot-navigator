import { setIcon } from 'obsidian';
export function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, options?: {
  className?: string,
  textContent?: string,
  attributes?: Record<string, string>,
  title?: string
}): HTMLElementTagNameMap[K] {
  const element = activeDocument.adoptNode(createEl(tag));
  if (options?.className) element.className = options.className;
  if (options?.textContent) element.textContent = options.textContent;
  if (options?.title) element.setAttribute('title', options.title);
  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  return element;
}

export function createActionButton(options: {
  icon: string,
  title: string,
  className?: string,
  attributes?: Record<string, string>
}): HTMLElement {
  const btn = createElement('div', {
    className: `dotn_button-icon ${options.className || ''}`,
    title: options.title,
    attributes: options.attributes || {}
  });
  setIcon(btn, options.icon);
  return btn;
}

