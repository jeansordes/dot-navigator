/** Own native listeners and pointer cleanup for a declaratively rendered card. */
export class RenderLifetime {
  private cleanups: Array<() => void> = [];

  listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void): void {
    target.addEventListener(type, listener);
    this.register(() => target.removeEventListener(type, listener));
  }

  register(cleanup: () => void): void { this.cleanups.push(cleanup); }

  dispose = (): void => {
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
  };
}
