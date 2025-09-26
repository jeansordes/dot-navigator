/**
 * Utility functions for autocomplete functionality
 */

import { performFuzzySearch, createHighlightedText } from './FuzzySearchUtils';
import { autoResize, updateSuggestionSelection } from '../ui/UIUtils';
import { t } from '../../i18n';
import { setIcon } from 'obsidian';

export interface AutocompleteCallbacks {
    validatePath: () => void;
    validateAndShowWarning: () => void;
    updateAllFileItems: (childrenList: HTMLElement) => void;
}

export interface AutocompleteState {
    suggestionsContainer: HTMLElement | null;
    suggestionElements: HTMLElement[];
    currentSuggestionIndex: number;
    originalTypedValue: string;
    allDirectories: string[];
    isEnabled: boolean;
}

/**
 * Set up path autocomplete functionality for an input element
 */
export function setupPathAutocomplete(
    input: HTMLTextAreaElement,
    container: HTMLElement,
    allDirectories: string[],
    callbacks: AutocompleteCallbacks
): () => AutocompleteState {
    // Create a mutable state object
    const state: AutocompleteState = {
        suggestionsContainer: null,
        suggestionElements: [],
        currentSuggestionIndex: -1,
        originalTypedValue: '',
        allDirectories,
        isEnabled: true
    };

    // Create suggestions container
    const createSuggestionsContainer = (): HTMLElement => {
        const suggestions = container.createEl('div', { cls: 'rename-path-suggestions' });

        // Position after the input container
        const inputContainer = container.querySelector('.rename-input-container');
        if (inputContainer) {
            inputContainer.insertAdjacentElement('afterend', suggestions);
        }

        state.suggestionsContainer = suggestions;
        return suggestions;
    };

    const showSuggestions = (query: string) => {
        if (!state.suggestionsContainer) {
            return;
        }

        if (!state.isEnabled) {
            state.suggestionsContainer.empty();
            return;
        }

        // Clear existing content
        state.suggestionsContainer.empty();

        // Handle empty input
        if (!query.trim()) {
            // Create header for empty state
            const header = state.suggestionsContainer.createEl('div', {
                cls: 'rename-path-suggestions-header'
            });
            const iconContainer = header.createEl('span', { cls: 'rename-suggestions-icon' });
            setIcon(iconContainer, 'folder');
            const _textSpan = header.createEl('span', {
                text: t('renameDialogPathSuggestions')
            });

            // Create list container with empty message
            const listContainer = state.suggestionsContainer.createEl('div', {
                cls: 'rename-path-suggestions-list'
            });
            const _emptyMsg = listContainer.createEl('div', {
                cls: 'rename-path-suggestions-no-results',
                text: 'Type to search for paths...'
            });
            return;
        }

        const matches = performFuzzySearch(query.trim(), allDirectories);

        // Add a header to clarify what the suggestions are for, show result count
        const header = state.suggestionsContainer.createEl('div', {
            cls: 'rename-path-suggestions-header'
        });

        // Create icon container and text
        const iconContainer = header.createEl('span', { cls: 'rename-suggestions-icon' });
        setIcon(iconContainer, 'folder');

        const resultCount = matches.length === 100 ? '100+' : matches.length.toString();
        const _textSpan = header.createEl('span', {
            text: `${t('renameDialogPathSuggestions')} (${resultCount})`
        });

        // Create scrollable list container
        const listContainer = state.suggestionsContainer.createEl('div', {
            cls: 'rename-path-suggestions-list'
        });

        if (matches.length === 0) {
            // Show "no results" message in the list container
            const _noResultsMsg = listContainer.createEl('div', {
                cls: 'rename-path-suggestions-no-results',
                text: 'No matching paths found'
            });
            return;
        }

        // Reset suggestion tracking
        state.suggestionElements = [];
        state.currentSuggestionIndex = -1;

        // Show all matches, but limit visible items to 10 with scrolling
        matches.forEach((matchResult, index) => {
            const suggestion = listContainer.createEl('div', {
                cls: 'rename-path-suggestion'
            });

            // Store the actual value in a data attribute for easy retrieval
            suggestion.setAttribute('data-value', matchResult.item);

            // Create highlighted version of the match
            suggestion.appendChild(createHighlightedText(matchResult.item, matchResult.matches));

            state.suggestionElements.push(suggestion);

            suggestion.addEventListener('click', () => {
                if (!state.isEnabled) {
                    return;
                }

                input.value = matchResult.item;
                callbacks.validatePath();
                autoResize(input);
                callbacks.validateAndShowWarning();
                state.currentSuggestionIndex = index;
                updateSuggestionSelection(state.suggestionElements, index);

                // Update the diff sections when suggestion is selected
                const childrenList = container.querySelector('.rename-children-list');
                if (childrenList instanceof HTMLElement) {
                    callbacks.updateAllFileItems(childrenList);
                }

                input.dispatchEvent(new Event('input'));
            });
        });
    };

    // Set up event listeners
    input.addEventListener('input', () => {
        if (!state.isEnabled) {
            return;
        }

        // Reset suggestion navigation when user types (but not when navigating)
        if (!input.hasAttribute('data-navigating')) {
            state.currentSuggestionIndex = -1;
            state.originalTypedValue = '';
            showSuggestions(input.value);
        }
    });

    input.addEventListener('focus', () => {
        if (!state.isEnabled) {
            return;
        }
        // Always show suggestions on focus, even if input is empty
        showSuggestions(input.value);
    });

    // Create the suggestions container
    state.suggestionsContainer = createSuggestionsContainer();

    // Return a function to get the current state (return the state object itself for mutability)
    return () => state;
}

/**
 * Navigate through autocomplete suggestions
 */
export function navigateSuggestions(
    direction: 'up' | 'down',
    state: AutocompleteState,
    input: HTMLTextAreaElement,
    callbacks: AutocompleteCallbacks,
    container: HTMLElement
): AutocompleteState {
    const { suggestionElements, currentSuggestionIndex } = state;

    if (!state.isEnabled) {
        return state;
    }

    if (suggestionElements.length === 0) {
        return state;
    }

    // Set navigating flag to prevent input event from resetting navigation
    input.setAttribute('data-navigating', 'true');

    // Store the original typed value if we haven't started navigation yet
    if (currentSuggestionIndex === -1) {
        state.originalTypedValue = input.value;
    }

    // Remove current selection
    if (currentSuggestionIndex >= 0) {
        suggestionElements[currentSuggestionIndex]?.removeClass('selected');
    }

    // Update index (allow going back to original typed value with -1)
    if (direction === 'down') {
        state.currentSuggestionIndex = Math.min(suggestionElements.length - 1, currentSuggestionIndex + 1);
    } else {
        state.currentSuggestionIndex = Math.max(-1, currentSuggestionIndex - 1);
    }

    // Apply new selection
    updateSuggestionSelection(suggestionElements, state.currentSuggestionIndex);

    // Apply the selected value to the input
    let valueToApply: string;
    if (state.currentSuggestionIndex === -1) {
        // Back to original typed value
        valueToApply = state.originalTypedValue || '';
    } else {
        // Use selected suggestion - get the data-value attribute or text content
        const selectedElement = suggestionElements[state.currentSuggestionIndex];
        valueToApply = selectedElement.getAttribute('data-value') || selectedElement.textContent || '';
    }

    input.value = valueToApply;
    callbacks.validatePath();
    autoResize(input);
    callbacks.validateAndShowWarning();

    // Update the diff sections when suggestion is applied via navigation
    const childrenList = container.querySelector('.rename-children-list');
    if (childrenList instanceof HTMLElement) {
        callbacks.updateAllFileItems(childrenList);
    }

    // Scroll into view if needed (only for actual suggestions, not original value)
    if (state.currentSuggestionIndex >= 0) {
        const selectedElement = suggestionElements[state.currentSuggestionIndex];
        if (selectedElement) {
            // Scroll within the list container, not the entire page
            selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // Dispatch input event while navigating flag is still set
    input.dispatchEvent(new Event('input'));

    // Reset navigating flag after navigation is complete
    input.removeAttribute('data-navigating');

    return state;
}
