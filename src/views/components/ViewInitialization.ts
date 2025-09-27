import { ItemView } from 'obsidian';

export class ViewInitialization {
    /**
     * Wait for the container to be properly initialized
     */
    static waitForContainerReady(view: ItemView): Promise<void> {
        return new Promise((resolve) => {
            const checkContainer = () => {
                // Check if containerEl exists and is an HTMLElement
                if (view.containerEl && view.containerEl instanceof HTMLElement) {
                    resolve();
                    return;
                }

                // If not ready, check again in a short while
                setTimeout(checkContainer, 10);
            };
            checkContainer();
        });
    }

    /**
     * Wait for CSS to be loaded by checking if the styles are applied
     * Uses optimized polling with increasing intervals and timeout
     */
    static waitForCSSLoad(view: ItemView): Promise<void> {
        return new Promise((resolve, _reject) => {
            let attempts = 0;
            const _maxAttempts = 100; // Max ~500ms (increasing intervals)
            const maxTime = 1000; // Hard timeout of 1 second
            const startTime = Date.now();

            const checkCSS = () => {
                attempts++;

                // Check if the main container has the dotn_view class and CSS is loaded
                if (view.containerEl && view.containerEl.classList.contains('dotn_view')) {
                    const computedStyle = window.getComputedStyle(view.containerEl);
                    if (computedStyle.getPropertyValue('--dotn_css-is-loaded')) {
                        resolve();
                        return;
                    }
                }

                // Timeout protection
                if (Date.now() - startTime > maxTime) {
                    console.warn('[DotNavigator] CSS loading timeout - proceeding anyway');
                    resolve(); // Don't fail, just proceed
                    return;
                }

                // Increasing intervals: start fast, then slow down
                let delay = 5; // Start with 5ms
                if (attempts > 10) delay = 10; // 10-20 attempts: 10ms
                if (attempts > 20) delay = 20; // 20+ attempts: 20ms

                setTimeout(checkCSS, delay);
            };

            // Start immediately (no initial delay)
            checkCSS();
        });
    }
}
