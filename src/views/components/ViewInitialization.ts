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
     */
    static waitForCSSLoad(view: ItemView): Promise<void> {
        return new Promise((resolve) => {
            const checkCSS = () => {
                // Check if the main container has the dotn_view class and CSS is loaded
                if (view.containerEl && view.containerEl.classList.contains('dotn_view')) {
                    const computedStyle = window.getComputedStyle(view.containerEl);
                    if (computedStyle.getPropertyValue('--dotn_css-is-loaded')) {
                        resolve();
                        return;
                    }
                }

                // If not ready, check again in a short while
                setTimeout(checkCSS, 10);
            };
            checkCSS();
        });
    }
}
