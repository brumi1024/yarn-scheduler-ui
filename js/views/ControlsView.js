class ControlsView extends EventEmitter {
    constructor(appStateModel) {
        super();
        this.appStateModel = appStateModel;

        this.controlsContainerEl = DomUtils.getById('queue-config-controls'); // For queue-specific controls
        this.partitionSelectEl = DomUtils.getById('partition-select');
        this.addQueueButtonEl = DomUtils.getById('btn-add-queue'); // Using ID
        this.bulkOperationsButtonEl = DomUtils.getById('btn-bulk-operations');
        this.searchInputEl = DomUtils.getById('search-input');
        this.sortSelectEl = DomUtils.getById('sort-select');
        this.refreshButtonEl = DomUtils.getById('btn-refresh-queues'); // Added refresh button

        if (
            !this.controlsContainerEl ||
            !this.partitionSelectEl ||
            !this.addQueueButtonEl ||
            !this.searchInputEl ||
            !this.sortSelectEl ||
            !this.refreshButtonEl
        ) {
            console.error('ControlsView: One or more required DOM elements are missing.');
            // Allow partial functionality if some elements are specific to certain tabs
            if (!this.refreshButtonEl) console.error('ControlsView: Refresh button is missing.');
        }

        this._bindEvents();

        this.appStateModel.subscribe('selectedPartitionChanged', (partition) =>
            this.renderSelectedPartition(partition)
        );
        this.appStateModel.subscribe('searchTermChanged', (term) => this.renderSearchTerm(term));
        this.appStateModel.subscribe('sortCriteriaChanged', (criteria) => this.renderSortCriteria(criteria));
    }

    _bindEvents() {
        if (this.partitionSelectEl) {
            this.partitionSelectEl.addEventListener('change', (event) => {
                this._emit('partitionSelected', event.target.value);
            });
        }

        if (this.addQueueButtonEl) {
            this.addQueueButtonEl.addEventListener('click', () => {
                this._emit('addQueueClicked');
            });
        }

        if (this.bulkOperationsButtonEl) {
            this.bulkOperationsButtonEl.addEventListener('click', () => {
                this._emit('bulkOperationsClicked');
            });
        }

        if (this.searchInputEl) {
            this.searchInputEl.addEventListener('input', (event) => {
                this._emit('searchTermChanged', event.target.value);
            });
        }

        if (this.sortSelectEl) {
            this.sortSelectEl.addEventListener('change', (event) => {
                this._emit('sortCriteriaChanged', event.target.value);
            });
        }

        if (this.refreshButtonEl) {
            // Bind event for refresh button
            this.refreshButtonEl.addEventListener('click', () => {
                this._emit('refreshDataClicked');
            });
        }
    }

    renderPartitions(partitions) {
        if (!this.partitionSelectEl) return;
        DomUtils.empty(this.partitionSelectEl);
        for (const partition of (partitions || [DEFAULT_PARTITION])) {
            const option = DomUtils.createElement('option', null, { value: partition }, partition || 'default');
            this.partitionSelectEl.append(option);
        }
        this.renderSelectedPartition(this.appStateModel.getSelectedPartition());
    }

    /**
     * Renders node labels in the partition selector
     * @param {Array<string>} nodeLabels - Available node labels
     */
    renderNodeLabels(nodeLabels) {
        if (!this.partitionSelectEl) return;
        
        DomUtils.empty(this.partitionSelectEl);
        
        // Add default partition
        const defaultOption = DomUtils.createElement('option', null, 
            { value: DEFAULT_PARTITION }, 'Default');
        this.partitionSelectEl.append(defaultOption);
        
        // Add node labels
        for (const label of (nodeLabels || [])) {
            const option = DomUtils.createElement('option', null, 
                { value: label }, label);
            this.partitionSelectEl.append(option);
        }
        
        this.renderSelectedPartition(this.appStateModel.getSelectedPartition());
    }

    renderSelectedPartition(selectedPartition) {
        if (this.partitionSelectEl && this.partitionSelectEl.value !== selectedPartition) {
            this.partitionSelectEl.value = selectedPartition;
        }
    }

    renderSearchTerm(searchTerm) {
        if (this.searchInputEl && this.searchInputEl.value !== searchTerm) {
            this.searchInputEl.value = searchTerm;
        }
    }

    renderSortCriteria(sortCriteria) {
        if (this.sortSelectEl && this.sortSelectEl.value !== sortCriteria) {
            this.sortSelectEl.value = sortCriteria;
        }
    }

    render() {
        this.renderSelectedPartition(this.appStateModel.getSelectedPartition());
        this.renderSearchTerm(this.appStateModel.getCurrentSearchTerm());
        this.renderSortCriteria(this.appStateModel.getCurrentSortCriteria());
    }
}
