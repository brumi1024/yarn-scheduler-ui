class BatchControlsView extends EventEmitter {
    constructor(appStateModel) {
        super();
        this.appStateModel = appStateModel; // To check if the queue-config tab is active

        this.batchControlsEl = DomUtils.getById('batch-controls');
        this.batchInfoEl = DomUtils.getById('batch-info');
        this.batchValidationEl = DomUtils.getById('batch-validation');
        this.applyChangesBtnEl = DomUtils.getById('btn-apply-changes');
        this.discardChangesBtnEl = DomUtils.qs('.btn-secondary', this.batchControlsEl); // Assuming it's the only secondary button

        if (
            !this.batchControlsEl ||
            !this.batchInfoEl ||
            !this.batchValidationEl ||
            !this.applyChangesBtnEl ||
            !this.discardChangesBtnEl
        ) {
            console.error('BatchControlsView: One or more required DOM elements are missing.');
            return;
        }

        this._bindEvents();

        // Listen for tab changes to control visibility
        this.appStateModel.subscribe('currentTabChanged', () => this.renderVisibility());
        // The actual data update will be triggered by the controller based on SchedulerConfigModel changes.
    }

    _bindEvents() {
        this.applyChangesBtnEl.addEventListener('click', () => {
            if (!this.applyChangesBtnEl.disabled) {
                this._emit('applyAllClicked');
            }
        });

        this.discardChangesBtnEl.addEventListener('click', () => {
            this._emit('discardAllClicked');
        });
    }

    /**
     * Renders the batch controls based on pending changes and validation status.
     * @param {Object} pendingCounts - { added: number, modified: number, deleted: number }
     * @param {Array<Object>} validationErrors - Array of error objects (e.g., { message: string })
     */
    render(pendingCounts = { added: 0, modified: 0, deleted: 0 }, validationErrors = []) {
        const totalChanges = pendingCounts.added + pendingCounts.modified + pendingCounts.deleted;

        if (totalChanges > 0) {
            const infoTextParts = [];
            if (pendingCounts.added > 0) infoTextParts.push(`${pendingCounts.added} added`);
            if (pendingCounts.modified > 0) infoTextParts.push(`${pendingCounts.modified} modified`);
            if (pendingCounts.deleted > 0) infoTextParts.push(`${pendingCounts.deleted} deleted`);
            this.batchInfoEl.textContent = infoTextParts.length > 0 ? infoTextParts.join(', ') : 'No changes staged';

            if (validationErrors.length === 0) {
                this.batchValidationEl.textContent = 'All changes valid ✓';
                this.batchValidationEl.className = 'batch-validation valid';
                this.applyChangesBtnEl.disabled = false;
            } else {
                const errorText = validationErrors.map((e) => e.message || String(e)).join('; ');
                this.batchValidationEl.textContent = `Validation errors: ${errorText}`;
                this.batchValidationEl.className = 'batch-validation'; // Default class implies error/warning
                this.applyChangesBtnEl.disabled = true;
            }
        }
        this.renderVisibility(totalChanges); // Pass totalChanges to avoid recalculating
    }

    /**
     * Controls the visibility of the batch controls bar.
     * Visible only if there are changes AND the queue config tab is active.
     * @param {number} [changeCount=-1] - Optional change count to avoid re-fetching from model if already known.
     */
    renderVisibility(changeCount = -1) {
        // If changeCount isn't passed, this method would ideally get it from SchedulerConfigModel.hasPendingChanges()
        // For now, this.render() passes it. Controller will call this.render().
        const isActiveTabQueueConfig = this.appStateModel.getCurrentTab() === 'queue-config-content';
        const shouldShow = changeCount > 0 && isActiveTabQueueConfig;

        if (shouldShow) {
            DomUtils.show(this.batchControlsEl, 'flex');
            this.batchControlsEl.classList.add('show');
        } else {
            DomUtils.hide(this.batchControlsEl);
            this.batchControlsEl.classList.remove('show');
        }
    }

    hide() {
        DomUtils.hide(this.batchControlsEl);
        this.batchControlsEl.classList.remove('show');
    }
}
