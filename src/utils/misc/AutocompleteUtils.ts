/**
 * Utility functions for autocomplete functionality
 */

import { performFuzzySearch, createHighlightedText } from './FuzzySearchUtils';

import { autoResize, updateSuggestionSelection } from '../ui/UIUtils';
import { t } from '../../i18n';
import { setIcon } from 'obsidian';

/**
 * Get the parent path of a given path
 * For "Notes/prj/subdir", returns "Notes/prj"
 * For "Notes", returns "" (no parent)
 */
export function getParentPath(path: string): string {
    const pathParts = path.split('/');
    if (pathParts.length <= 1) {
        return ''; // No parent for root level or single component
    }
    return pathParts.slice(0, -1).join('/');
}

/**
 * Extract grandparent directory from a file path for path suggestions
 * For "Notes/prj.s2ee.job-commercial.md", returns ["Notes/prj"] (only the grandparent)
 */
export function extractParentPaths(filePath: string): string[] {
    // Remove extension if present
    const pathWithoutExt = filePath.replace(/\.[^.]+$/, '');

    const pathParts = pathWithoutExt.split('/');
    const parentPaths: string[] = [];

    // Handle directory-based paths
    if (pathParts.length > 1) {
        const directoryPath = pathParts.slice(0, -1).join('/');
        const lastPart = pathParts[pathParts.length - 1];

        // If the last part contains dots (hierarchical), extract the grandparent
        if (lastPart.includes('.')) {
            const hierarchicalParts = lastPart.split('.');
            // The grandparent is everything except the last two hierarchical parts
            // (immediate parent + current node)
            if (hierarchicalParts.length > 2) {
                const grandparentHierarchical = hierarchicalParts.slice(0, -2).join('.');
                const grandparentPath = directoryPath ? `${directoryPath}/${grandparentHierarchical}` : grandparentHierarchical;
                if (grandparentPath.trim()) {
                    parentPaths.push(grandparentPath);
                }
            }
        }
        // If no hierarchical structure, the grandparent would be the directory itself
        // But since we want to exclude immediate parent and root, we don't add anything here
    }
    // For root-level files with hierarchical names, there is no grandparent to suggest

    return parentPaths;
}

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
    callbacks: AutocompleteCallbacks,
    currentFilePath?: string
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

        let matches = performFuzzySearch(query.trim(), allDirectories);

        // Prepend parent path of current query (highest priority)
        const queryTrimmed = query.trim();
        if (queryTrimmed) {
            // Extract parent of current query input
            const queryParent = getParentPath(queryTrimmed);
            if (queryParent && queryParent !== queryTrimmed) {
            const queryParentSuggestion: { item: string; score: number; matches: Array<{ start: number; end: number }> } = {
                item: queryParent,
                score: 1001, // Highest score to ensure it appears first
                matches: [{ start: 0, end: queryParent.length }] // Highlight entire text
            };
                matches = [queryParentSuggestion, ...matches];
            }
        }

        // Prepend parent paths from current file if available (lower priority)
        if (currentFilePath) {
            const parentPaths = extractParentPaths(currentFilePath);
            const parentSuggestions = parentPaths.map(parentPath => ({
                item: parentPath,
                score: 1000, // High score to ensure parent paths appear first
                matches: [{ start: 0, end: parentPath.length }] // Highlight entire text
            }));

            // Add to the beginning, but after query parent if it exists
            matches = [...parentSuggestions, ...matches];
        }

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

        // Show all matches, but limit visible items to 100 with scrolling
        matches.slice(0, 100).forEach((matchResult, index) => {
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
