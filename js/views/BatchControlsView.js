class BatchControlsView extends EventEmitter {
    constructor(appStateModel) {
        super();
        this.appStateModel = appStateModel; // To check if the queue-config tab is active

        this.batchControlsEl = DomUtils.getById('batch-controls');
        this.batchInfoEl = DomUtils.getById('batch-info');
        this.batchValidationEl = DomUtils.getById('batch-validation');
        this.applyChangesBtnEl = DomUtils.getById('btn-apply-changes');
        this.previewChangesBtnEl = DomUtils.getById('btn-preview-changes');
        this.discardChangesBtnEl = DomUtils.getById('btn-discard-changes');

        // Change preview modal elements
        this.previewModalEl = DomUtils.getById('change-preview-modal');
        this.previewContainerEl = DomUtils.getById('change-preview-container');
        this.closePreviewBtnEl = DomUtils.getById('close-preview-btn');
        this.applyFromPreviewBtnEl = DomUtils.getById('apply-from-preview-btn');

        if (
            !this.batchControlsEl ||
            !this.batchInfoEl ||
            !this.batchValidationEl ||
            !this.applyChangesBtnEl ||
            !this.previewChangesBtnEl ||
            !this.discardChangesBtnEl ||
            !this.previewModalEl ||
            !this.previewContainerEl
        ) {
            console.error('BatchControlsView: One or more required DOM elements are missing.');
            return;
        }

        // Initialize change preview
        this.changePreview = new ChangePreview(this.previewContainerEl, {
            showDiff: true,
            showSummary: true,
            collapsible: true,
            maxChanges: 50,
        });

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

        this.previewChangesBtnEl.addEventListener('click', () => {
            this._emit('previewChangesClicked');
        });

        this.discardChangesBtnEl.addEventListener('click', () => {
            this._emit('discardAllClicked');
        });

        // Change preview modal events
        if (this.closePreviewBtnEl) {
            this.closePreviewBtnEl.addEventListener('click', () => {
                this.hidePreviewModal();
            });
        }

        if (this.applyFromPreviewBtnEl) {
            this.applyFromPreviewBtnEl.addEventListener('click', () => {
                this.hidePreviewModal();
                this._emit('applyAllClicked');
            });
        }

        // Close modal when clicking backdrop
        if (this.previewModalEl) {
            this.previewModalEl.addEventListener('click', (event) => {
                if (event.target === this.previewModalEl || event.target.classList.contains('modal-backdrop')) {
                    this.hidePreviewModal();
                }
            });

            // Close button in modal header
            const closeBtn = this.previewModalEl.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hidePreviewModal();
                });
            }
        }
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
        const currentTab = this.appStateModel.getCurrentTab();
        const isActiveTabWithChanges =
            currentTab === 'queue-config-content' || currentTab === 'scheduler-config-content';
        const shouldShow = changeCount > 0 && isActiveTabWithChanges;

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

    /**
     * Updates the change preview with current changes.
     * @param {Object} changes - Changes to preview (ChangeLog format)
     */
    updateChangePreview(changes) {
        if (!this.changePreview) return;

        let previewChanges = [];

        if (changes && typeof changes.getChanges === 'function') {
            // ChangeLog format
            previewChanges = ChangePreview.fromChangeLog(changes);
        }

        this.changePreview.setChanges(previewChanges);
    }

    /**
     * Shows the change preview modal.
     */
    showPreviewModal() {
        if (this.previewModalEl) {
            this.previewModalEl.style.display = 'flex';
            this.changePreview.render();
        }
    }

    /**
     * Hides the change preview modal.
     */
    hidePreviewModal() {
        if (this.previewModalEl) {
            this.previewModalEl.style.display = 'none';
        }
    }
}
