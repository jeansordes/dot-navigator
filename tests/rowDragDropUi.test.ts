import { resolveDropTarget } from '../src/views/row/rowDragDropUi';

class FakeElement {
    dataset: Record<string, string> = {};
    private parent: FakeElement | null = null;
    private kind: string | null = null;

    constructor(private readonly classes: string[] = []) {}

    appendChild(child: FakeElement): void {
        child.parent = this;
    }

    closest(selector: string): FakeElement | null {
        if (selector === '.tree-row') {
            return this.findClosestWithClass('tree-row');
        }
        if (selector === '.dotn_view-header') {
            return this.findClosestWithClass('dotn_view-header');
        }
        return null;
    }

    querySelector(selector: string): FakeElement | null {
        if (selector === '.dotn_tree-item-title') {
            const title = new FakeElement(['dotn_tree-item-title']);
            title.kind = this.kind;
            return title;
        }
        return null;
    }

    contains(element: FakeElement): boolean {
        if (element === this) return true;
        if (!element.parent) return false;
        return this.contains(element.parent);
    }

    getAttribute(name: string): string | null {
        if (name === 'data-node-kind') return this.kind;
        return null;
    }

    setNodeKind(kind: string): void {
        this.kind = kind;
    }

    private findClosestWithClass(className: string): FakeElement | null {
        if (this.classes.includes(className)) return this;
        return this.parent?.findClosestWithClass(className) ?? null;
    }
}

describe('resolveDropTarget', () => {
    const originalDocument = globalThis.document;
    const originalHTMLElement = globalThis.HTMLElement;

    beforeEach(() => {
        Object.defineProperty(globalThis, 'HTMLElement', {
            value: FakeElement,
            configurable: true
        });
    });

    afterEach(() => {
        Object.defineProperty(globalThis, 'document', {
            value: originalDocument,
            configurable: true
        });
        Object.defineProperty(globalThis, 'HTMLElement', {
            value: originalHTMLElement,
            configurable: true
        });
    });

    function mockElementFromPoint(element: FakeElement): void {
        Object.defineProperty(globalThis, 'document', {
            value: { elementFromPoint: jest.fn(() => element) },
            configurable: true
        });
    }

    it('does not treat suggestion rows as root drops', () => {
        const viewBody = new FakeElement();
        const row = new FakeElement(['tree-row']);
        row.dataset.id = 'project.archive.md';
        row.setNodeKind('suggestion');
        const target = new FakeElement();
        viewBody.appendChild(row);
        row.appendChild(target);
        mockElementFromPoint(target);

        expect(resolveDropTarget(1, 1, viewBody as unknown as HTMLElement)).toBeNull();
    });

    it('still treats empty view body space as a root drop', () => {
        const viewBody = new FakeElement();
        const target = new FakeElement();
        viewBody.appendChild(target);
        mockElementFromPoint(target);

        expect(resolveDropTarget(1, 1, viewBody as unknown as HTMLElement)).toEqual({
            targetPath: '',
            targetKind: 'root'
        });
    });
});
