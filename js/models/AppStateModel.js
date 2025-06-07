/**
 * @file Manages UI-specific application state, such as current tab, search term, etc.
 */
class AppStateModel extends EventEmitter {
    constructor() {
        super();
        this._currentTab = 'queue-config-content'; // Default active tab
        this._currentSearchTerm = '';
        this._currentSortCriteria = 'capacity'; // Default sort
        this._selectedPartition = DEFAULT_PARTITION; // Default partition (empty string)
        this._isGlobalConfigInEditMode = false;
        this._isLoading = false;
        this._loadingMessage = '';
    }

    // --- Getters ---
    getCurrentTab() {
        return this._currentTab;
    }
    getCurrentSearchTerm() {
        return this._currentSearchTerm;
    }
    getCurrentSortCriteria() {
        return this._currentSortCriteria;
    }
    getSelectedPartition() {
        return this._selectedPartition;
    }

    /**
     * Gets the currently selected node label (alias for partition)
     * @returns {string} Currently selected node label
     */
    getSelectedNodeLabel() {
        return this._selectedPartition;
    }
    isGlobalConfigInEditMode() {
        return this._isGlobalConfigInEditMode;
    }
    isLoading() {
        return this._isLoading;
    }
    getLoadingMessage() {
        return this._loadingMessage;
    }

    // --- Setters ---
    /**
     * Sets the current active tab.
     * @param {string} tabId - The ID of the tab to set as active.
     */
    setCurrentTab(tabId) {
        if (this._currentTab !== tabId) {
            this._currentTab = tabId;
            this._emit('currentTabChanged', tabId);
        }
    }

    /**
     * Sets the current search term.
     * @param {string} term - The search term.
     */
    setCurrentSearchTerm(term) {
        const normalizedTerm = (term || '').trim();
        if (this._currentSearchTerm !== normalizedTerm) {
            this._currentSearchTerm = normalizedTerm;
            this._emit('searchTermChanged', normalizedTerm);
        }
    }

    /**
     * Sets the current sorting criteria.
     * @param {string} criteria - The sort criteria (e.g., 'name', 'capacity').
     */
    setCurrentSortCriteria(criteria) {
        if (this._currentSortCriteria !== criteria) {
            this._currentSortCriteria = criteria;
            this._emit('sortCriteriaChanged', criteria);
        }
    }

    /**
     * Sets the selected partition.
     * @param {string} partition - The selected partition name.
     */
    setSelectedPartition(partition) {
        const newPartition = partition === undefined || partition === null ? DEFAULT_PARTITION : partition;
        if (this._selectedPartition !== newPartition) {
            this._selectedPartition = newPartition;
            this._emit('selectedPartitionChanged', newPartition);
        }
    }

    /**
     * Sets the edit mode for global scheduler configuration.
     * @param {boolean} isInEditMode - True if in edit mode, false otherwise.
     */
    setGlobalConfigEditMode(isInEditMode) {
        if (this._isGlobalConfigInEditMode !== isInEditMode) {
            this._isGlobalConfigInEditMode = isInEditMode;
            this._emit('globalConfigEditModeChanged', isInEditMode);
        }
    }

    /**
     * Sets the loading state of the application.
     * @param {boolean} isLoading - True if the application is loading, false otherwise.
     * @param {string} [message=""] - An optional message to display while loading.
     */
    setLoading(isLoading, message = '') {
        const newLoadingState = !!isLoading; // Coerce to boolean
        const newMessage = newLoadingState ? message : ''; // Clear message if not loading

        if (this._isLoading !== newLoadingState || (newLoadingState && this._loadingMessage !== newMessage)) {
            this._isLoading = newLoadingState;
            this._loadingMessage = newMessage;
            this._emit('loadingStateChanged', { isLoading: this._isLoading, message: this._loadingMessage });
        }
    }

    /**
     * Checks if legacy queue mode is enabled based on global configuration.
     * @param {Map<string, string>} globalConfig - The global configuration properties
     * @returns {boolean} True if legacy mode is enabled (default), false otherwise
     */
    isLegacyModeEnabled(globalConfig) {
        if (!globalConfig || !globalConfig.has) {
            return true; // Default to legacy mode if no config
        }

        const legacyModeValue = globalConfig.get('yarn.scheduler.capacity.legacy-queue-mode.enabled');

        // Default to true if not set, only false if explicitly set to 'false'
        return legacyModeValue !== 'false';
    }
}
