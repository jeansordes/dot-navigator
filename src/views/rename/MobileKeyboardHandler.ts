import { Platform } from 'obsidian';

/**
 * Handles mobile-specific keyboard detection and scrolling behavior
 * for the rename dialog, with special support for iOS devices.
 */
export class MobileKeyboardHandler {
    private contentEl: HTMLElement;
    private mobileBodyEl?: HTMLElement;
    private visualViewport?: VisualViewport;
    private viewportChangeHandler?: () => void;
    private mobileTouchStartHandler?: (event: TouchEvent) => void;
    private mobileTouchMoveHandler?: (event: TouchEvent) => void;
    private mobileTouchEndHandler?: (event: TouchEvent) => void;

    constructor(contentEl: HTMLElement) {
        this.contentEl = contentEl;
        this.initializeMobileTouchHandling();
    }

    private initializeMobileTouchHandling(): void {
        // Find the mobile body element
        this.mobileBodyEl = this.contentEl.querySelector('.rename-mobile-body') as HTMLElement;

        if (!this.mobileBodyEl) {
            return;
        }

        // iOS-specific keyboard detection using Visual Viewport API
        this.setupIOSKeyboardDetection();

        // Add focus/blur detection for input fields
        this.setupInputFocusDetection();

        // Add touch event handlers for better scrolling on mobile
        this.mobileTouchStartHandler = (event: TouchEvent) => {
            // Store initial touch position for scroll detection
            const touch = event.touches[0];
            if (touch) {
                this.mobileBodyEl!.dataset.touchStartY = touch.clientY.toString();
            }
        };

        this.mobileTouchMoveHandler = (event: TouchEvent) => {
            if (!this.mobileBodyEl) return;

            const touch = event.touches[0];
            if (!touch) return;

            const startY = parseFloat(this.mobileBodyEl.dataset.touchStartY || '0');
            const currentY = touch.clientY;
            const deltaY = startY - currentY;

            // Get scroll position info
            const scrollTop = this.mobileBodyEl.scrollTop;
            const scrollHeight = this.mobileBodyEl.scrollHeight;
            const clientHeight = this.mobileBodyEl.clientHeight;

            // Allow scrolling when:
            // 1. Scrolling down and not at top, OR
            // 2. Scrolling up and not at bottom
            const canScrollDown = scrollTop > 0;
            const canScrollUp = scrollTop < scrollHeight - clientHeight;

            if ((deltaY < 0 && canScrollDown) || (deltaY > 0 && canScrollUp)) {
                // Allow the scroll to happen naturally
                return;
            }

            // If we can't scroll in the intended direction, prevent default
            // This prevents the page from scrolling when the modal is at its scroll limits
            if (Math.abs(deltaY) > 10) { // Small threshold to avoid interfering with taps
                event.preventDefault();
            }
        };

        this.mobileTouchEndHandler = () => {
            // Clean up touch data
            if (this.mobileBodyEl) {
                delete this.mobileBodyEl.dataset.touchStartY;
            }
        };

        // Register the touch event handlers
        this.mobileBodyEl.addEventListener('touchstart', this.mobileTouchStartHandler, { passive: false });
        this.mobileBodyEl.addEventListener('touchmove', this.mobileTouchMoveHandler, { passive: false });
        this.mobileBodyEl.addEventListener('touchend', this.mobileTouchEndHandler, { passive: true });
    }

    private setupIOSKeyboardDetection(): void {
        // Use Visual Viewport API for iOS keyboard detection
        if (window.visualViewport) {
            this.visualViewport = window.visualViewport;

            this.viewportChangeHandler = () => {
                if (!this.visualViewport) return;

                const viewportHeight = this.visualViewport.height;
                const windowHeight = window.innerHeight;

                // On iOS, when keyboard appears, visualViewport.height becomes smaller than window.innerHeight
                const keyboardVisible = viewportHeight < windowHeight * 0.8; // 80% threshold

                if (keyboardVisible) {
                    // Apply iOS-specific keyboard styles
                    this.applyIOSKeyboardStyles();
                } else {
                    // Reset to normal styles
                    this.resetIOSKeyboardStyles();
                }
            };

            this.visualViewport.addEventListener('resize', this.viewportChangeHandler);
        }
    }

    private setupInputFocusDetection(): void {
        // Detect when inputs gain/lose focus (keyboard appears/disappears)
        const inputs = this.contentEl.querySelectorAll('input, textarea');

        const handleFocus = () => {
            // Small delay to let iOS keyboard animation complete
            setTimeout(() => {
                this.applyIOSKeyboardStyles();
            }, 300);
        };

        const handleBlur = () => {
            // Small delay before resetting to handle focus switching between inputs
            setTimeout(() => {
                // Check if any input still has focus
                const focusedElement = document.activeElement;
                const isInputFocused = focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA');

                if (!isInputFocused) {
                    this.resetIOSKeyboardStyles();
                }
            }, 100);
        };

        inputs.forEach(input => {
            input.addEventListener('focus', handleFocus);
            input.addEventListener('blur', handleBlur);
        });
    }

    private applyIOSKeyboardStyles(): void {
        if (!this.mobileBodyEl) return;

        // Force modal to use available visual viewport space
        const modal = this.contentEl.closest('.modal');
        if (modal) {
            modal.classList.add('ios-keyboard-active');
        }

        // Add keyboard active class to body for CSS styling
        this.mobileBodyEl.classList.add('ios-keyboard-body-active');
    }

    private resetIOSKeyboardStyles(): void {
        if (!this.mobileBodyEl) return;

        // Reset modal styles
        const modal = this.contentEl.closest('.modal');
        if (modal) {
            modal.classList.remove('ios-keyboard-active');
        }

        // Reset body styles
        this.mobileBodyEl.classList.remove('ios-keyboard-body-active');
    }

    /**
     * Clean up all event listeners and reset styles
     */
    destroy(): void {
        // Clean up touch handlers
        if (this.mobileBodyEl && this.mobileTouchStartHandler) {
            this.mobileBodyEl.removeEventListener('touchstart', this.mobileTouchStartHandler);
        }
        if (this.mobileBodyEl && this.mobileTouchMoveHandler) {
            this.mobileBodyEl.removeEventListener('touchmove', this.mobileTouchMoveHandler);
        }
        if (this.mobileBodyEl && this.mobileTouchEndHandler) {
            this.mobileBodyEl.removeEventListener('touchend', this.mobileTouchEndHandler);
        }

        // Clean up iOS keyboard detection
        if (this.visualViewport && this.viewportChangeHandler) {
            this.visualViewport.removeEventListener('resize', this.viewportChangeHandler);
        }

        // Reset any applied iOS keyboard styles
        this.resetIOSKeyboardStyles();

        // Clear references
        this.mobileBodyEl = undefined;
        this.visualViewport = undefined;
        this.viewportChangeHandler = undefined;
        this.mobileTouchStartHandler = undefined;
        this.mobileTouchMoveHandler = undefined;
        this.mobileTouchEndHandler = undefined;
    }
}
