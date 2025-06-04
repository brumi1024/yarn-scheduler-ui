class LoadingView {
    constructor(appStateModel) {
        this.appStateModel = appStateModel; // To listen for loading state changes

        this.loadingContainerEl = DomUtils.getById('loading-container');
        this.loadingTextEl = DomUtils.getById('loading-text');
        this.mainContentWrapperEl = DomUtils.getById('main-content'); // The main content area that gets hidden

        if (!this.loadingContainerEl || !this.loadingTextEl || !this.mainContentWrapperEl) {
            console.error(
                'LoadingView: Required DOM elements not found (loading-container, loading-text, or main-content).'
            );
        }

        // Subscribe to loading state changes from AppStateModel
        this.appStateModel.subscribe('loadingStateChanged', this._handleLoadingStateChange.bind(this));
    }

    _handleLoadingStateChange({ isLoading, message }) {
        if (isLoading) {
            this.show(message);
        } else {
            this.hide();
        }
    }

    /**
     * Shows the loading indicator.
     * @param {string} [message="Loading..."] - The message to display.
     * @private
     */
    show(message = 'Loading...') {
        if (this.loadingTextEl) {
            this.loadingTextEl.textContent = message;
        }
        if (this.loadingContainerEl) {
            DomUtils.show(this.loadingContainerEl, 'flex');
        }
        if (this.mainContentWrapperEl) {
            DomUtils.hide(this.mainContentWrapperEl);
        }
    }

    /**
     * Hides the loading indicator.
     * @private
     */
    hide() {
        if (this.loadingContainerEl) {
            DomUtils.hide(this.loadingContainerEl);
        }
        if (this.mainContentWrapperEl) {
            // Show the main content wrapper; specific tab visibility is handled by TabView/MainController
            DomUtils.show(this.mainContentWrapperEl);
        }
    }
}
