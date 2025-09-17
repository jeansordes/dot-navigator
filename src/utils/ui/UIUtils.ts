/**
 * Utility functions for UI manipulation
 */

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
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;

    // Use the larger of scrollHeight or single-line height
    textarea.style.height = `${Math.max(scrollHeight, singleLineHeight)}px`;
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
