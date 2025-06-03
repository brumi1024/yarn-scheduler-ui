/**
 * @file Manages UI-specific application state, such as current tab, search term, etc.
 */
class AppStateModel extends EventEmitter {
    constructor() {
        super();
        this._currentTab = 'queue-config-content'; // Default active tab
        this._currentSearchTerm = '';
        this._currentSortCriteria = 'capacity'; // Default sort
        this._selectedPartition = DEFAULT_PARTITION; // Default partition
        this._isGlobalConfigInEditMode = false;
    }

    // --- Getters ---
    getCurrentTab() { return this._currentTab; }
    getCurrentSearchTerm() { return this._currentSearchTerm; }
    getCurrentSortCriteria() { return this._currentSortCriteria; }
    getSelectedPartition() { return this._selectedPartition; }
    isGlobalConfigInEditMode() { return this._isGlobalConfigInEditMode; }

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
        const newPartition = (partition === undefined || partition === null) ? DEFAULT_PARTITION : partition;
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
}