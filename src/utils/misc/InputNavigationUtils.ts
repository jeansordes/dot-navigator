/**
 * Utility functions for input navigation and keyboard handling
 */

import { Scope } from 'obsidian';
import { RenameMode, RenameDialogData } from '../../types';
import { AutocompleteState, navigateSuggestions } from './AutocompleteUtils';

// Extend HTMLElement to include our custom property for event listener storage
declare global {
    interface HTMLElement {
        _navigationListener?: (e: KeyboardEvent) => void;
    }
}

export interface NavigationCallbacks {
    close: () => void;
    shouldProceedWithRename: () => boolean;
    handleRename: () => void;
    showNoChangesMessage: () => void;
}

export interface NavigationContext {
    pathInput: HTMLTextAreaElement;
    nameInput: HTMLTextAreaElement;
    contentEl: HTMLElement;
    data: RenameDialogData;
    modeSelection: RenameMode;
    autocompleteState: AutocompleteState | (() => AutocompleteState | null) | null;
    setAutocompleteState: (state: AutocompleteState | null) => void;
    validatePath: () => void;
    validateAndShowWarning: () => void;
    updateAllFileItems: (childrenList: HTMLElement) => void;
}

/**
 * Set up keyboard navigation between input fields
 */
export function setupInputNavigation(
    input: HTMLTextAreaElement,
    context: NavigationContext
): void {
    const { pathInput, nameInput } = context;

    // Remove any existing navigation event listener to prevent duplicates
    const existingListener = input._navigationListener;
    if (existingListener) {
        input.removeEventListener('keydown', existingListener);
    }

    const navigationHandler = (e: KeyboardEvent) => {
        const isPathInput = input === pathInput;
        const isNameInput = input === nameInput;

        if (e.key === 'ArrowRight' && isPathInput) {
            // At the end of path input, jump to beginning of name input
            const cursorPosition = input.selectionStart || 0;
            const inputLength = input.value.length;

            if (cursorPosition === inputLength && nameInput) {
                e.preventDefault();
                nameInput.focus();
                nameInput.setSelectionRange(0, 0);
            }
        } else if (e.key === 'ArrowLeft' && isNameInput) {
            // At the beginning of name input, jump to end of path input
            const cursorPosition = input.selectionStart || 0;

            if (cursorPosition === 0 && pathInput) {
                e.preventDefault();
                pathInput.focus();
                const pathLength = pathInput.value.length;
                pathInput.setSelectionRange(pathLength, pathLength);
            }
        } else if (e.key === 'ArrowUp' && isPathInput) {
            // Up arrow in path input: navigate suggestions and update input instantly
            e.preventDefault();
            if (context.autocompleteState) {
                // Get the current state (either from object or function)
                const currentState = typeof context.autocompleteState === 'function'
                    ? context.autocompleteState()
                    : context.autocompleteState;

                if (!currentState) {
                    return; // State is null, skip navigation
                }

                const newState = navigateSuggestions(
                    'up',
                    currentState,
                    input,
                    {
                        validatePath: context.validatePath,
                        validateAndShowWarning: context.validateAndShowWarning,
                        updateAllFileItems: context.updateAllFileItems
                    },
                    context.contentEl
                );
                context.setAutocompleteState(newState);

                // Ensure input maintains focus after navigation
                if (document.activeElement !== input) {
                    input.focus();
                }
            }
        } else if (e.key === 'ArrowDown' && isPathInput) {
            // Down arrow in path input: navigate suggestions and update input instantly
            e.preventDefault();
            if (context.autocompleteState) {
                // Get the current state (either from object or function)
                const currentState = typeof context.autocompleteState === 'function'
                    ? context.autocompleteState()
                    : context.autocompleteState;

                if (!currentState) {
                    return; // State is null, skip navigation
                }

                const newState = navigateSuggestions(
                    'down',
                    currentState,
                    input,
                    {
                        validatePath: context.validatePath,
                        validateAndShowWarning: context.validateAndShowWarning,
                        updateAllFileItems: context.updateAllFileItems
                    },
                    context.contentEl
                );
                context.setAutocompleteState(newState);

                // Ensure input maintains focus after navigation
                if (document.activeElement !== input) {
                    input.focus();
                }
            }
        }
    };

    // Store reference to the event listener for cleanup
    input._navigationListener = navigationHandler;

    input.addEventListener('keydown', navigationHandler);
}

/**
 * Set up keyboard navigation for the dialog (Enter, Escape, etc.)
 */
export function setupKeyboardNavigation(
    scope: Scope,
    callbacks: NavigationCallbacks
): void {
    scope.register([], 'Escape', () => {
        callbacks.close();
    });

    scope.register([], 'Enter', (evt: KeyboardEvent) => {
        // Check if we should proceed with rename or just close
        if (callbacks.shouldProceedWithRename()) {
            callbacks.handleRename();
        } else {
            // No changes detected, keep modal open and let the dialog inform the user
            evt.preventDefault();
            evt.stopPropagation();
            callbacks.showNoChangesMessage();
        }
    });

    // Note: Up/Down arrow navigation for inputs is handled in setupInputNavigation
}
