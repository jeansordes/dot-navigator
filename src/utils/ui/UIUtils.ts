/**
 * Utility functions for UI manipulation
 */

const NEWLINE_RE = /[\r\n]/;

/** Replace line breaks with spaces (does not trim the whole string). */
export function collapseNewlines(value: string): string {
    return value.replace(/[\r\n]+/g, ' ');
}

/**
 * Collapse pasted or typed newlines in a single-line field and adjust the caret.
 * Returns true when the value was modified.
 */
export function sanitizeSingleLineField(
    field: HTMLInputElement | HTMLTextAreaElement
): boolean {
    const { value, selectionStart, selectionEnd } = field;
    if (!NEWLINE_RE.test(value)) return false;

    const collapsed = collapseNewlines(value);
    field.value = collapsed;

    const mapPos = (pos: number | null): number => {
        if (pos === null) return collapsed.length;
        return collapseNewlines(value.slice(0, pos)).length;
    };

    field.selectionStart = mapPos(selectionStart);
    field.selectionEnd = mapPos(selectionEnd ?? selectionStart);
    return true;
}

/**
 * Auto-resize a textarea element based on its content
 */
export function autoResize(textarea: HTMLTextAreaElement): void {
    // Calculate the proper height based on content
    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);

    // Calculate single line height (font-size * line-height + padding)
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    const singleLineHeight = fontSize * (isNaN(lineHeight) ? 1.2 : lineHeight / fontSize) + paddingTop + paddingBottom;

    // Reset height to auto to measure content
    textarea.setCssStyles({ height: 'auto' });
    const scrollHeight = textarea.scrollHeight;

    // Use the larger of scrollHeight or single-line height
    textarea.setCssStyles({ height: `${Math.max(scrollHeight, singleLineHeight)}px` });
}

/**
 * Update the visual selection state of suggestion elements
 */
export function updateSuggestionSelection(
    suggestionElements: HTMLElement[],
    currentSuggestionIndex: number
): void {
    // Remove all selections
    suggestionElements.forEach(el => el.removeClass('selected'));

    // Add selection to current item
    if (currentSuggestionIndex >= 0 && currentSuggestionIndex < suggestionElements.length) {
        suggestionElements[currentSuggestionIndex].addClass('selected');
    }
}
