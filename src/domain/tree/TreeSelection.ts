/** Group membership is independent of the editor's active file. */
export class TreeSelection {
  readonly ids = new Set<string>();
  focus?: string;
  anchor?: string;
  private rangeBase?: Set<string>;

  clear(): void {
    this.ids.clear();
    this.anchor = undefined;
    this.rangeBase = undefined;
  }

  toggle(id: string): void {
    if (this.ids.has(id)) this.ids.delete(id);
    else this.ids.add(id);
    this.focus = this.anchor = id;
    this.rangeBase = undefined;
  }

  replace(id: string): void {
    this.clear();
    this.ids.add(id);
    this.focus = this.anchor = id;
  }

  range(id: string, visible: readonly string[], additive: boolean): void {
    const target = visible.indexOf(id);
    if (target < 0) return;
    if (!this.anchor || !visible.includes(this.anchor)) {
      this.anchor = this.focus && visible.includes(this.focus) ? this.focus : id;
    }
    const start = visible.indexOf(this.anchor);
    this.rangeBase ??= new Set(this.ids);
    this.ids.clear();
    if (additive) for (const previous of this.rangeBase) this.ids.add(previous);
    for (let i = Math.min(start, target); i <= Math.max(start, target); i++) this.ids.add(visible[i]);
    this.focus = id;
  }

  moveFocus(id: string): void {
    this.focus = id;
    this.rangeBase = undefined;
  }

  all(visible: readonly string[]): void {
    this.clear();
    for (const id of visible) this.ids.add(id);
    this.anchor = this.focus;
  }

  reconcile(existing: ReadonlySet<string>): void {
    for (const id of this.ids) if (!existing.has(id)) this.ids.delete(id);
    if (this.anchor && !existing.has(this.anchor)) this.anchor = undefined;
    if (this.focus && !existing.has(this.focus)) this.focus = undefined;
    if (this.rangeBase) for (const id of this.rangeBase) if (!existing.has(id)) this.rangeBase.delete(id);
  }

  remap(from: string, to?: string): void {
    const map = (id: string): string | undefined => {
      if (id !== from && !id.startsWith(`${from}/`)) return id;
      return to === undefined ? undefined : to + id.slice(from.length);
    };
    const update = (set: Set<string>): void => {
      const ids = [...set];
      set.clear();
      for (const id of ids) { const next = map(id); if (next) set.add(next); }
    };
    update(this.ids);
    if (this.rangeBase) update(this.rangeBase);
    if (this.anchor) this.anchor = map(this.anchor);
    if (this.focus) this.focus = map(this.focus);
  }
}
