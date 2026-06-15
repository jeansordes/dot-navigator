import { collapseNewlines, sanitizeSingleLineField } from '../src/utils/ui/UIUtils';

function mockField(value: string, selection = value.length): HTMLInputElement {
    const field = {
        value,
        selectionStart: selection,
        selectionEnd: selection,
    };
    return field as HTMLInputElement;
}

describe('UIUtils single-line sanitization', () => {
    describe('collapseNewlines', () => {
        it('replaces line breaks with spaces', () => {
            expect(collapseNewlines('foo\nbar\r\nbaz')).toBe('foo bar baz');
        });

        it('leaves values without newlines unchanged', () => {
            expect(collapseNewlines('foo/bar')).toBe('foo/bar');
        });
    });

    describe('sanitizeSingleLineField', () => {
        it('collapses pasted newlines and adjusts the caret', () => {
            const field = mockField('dir/foo\nbar');

            expect(sanitizeSingleLineField(field)).toBe(true);
            expect(field.value).toBe('dir/foo bar');
            expect(field.selectionStart).toBe(field.value.length);
            expect(field.selectionEnd).toBe(field.value.length);
        });

        it('returns false when no newlines are present', () => {
            const field = mockField('unchanged');

            expect(sanitizeSingleLineField(field)).toBe(false);
            expect(field.value).toBe('unchanged');
        });
    });
});
