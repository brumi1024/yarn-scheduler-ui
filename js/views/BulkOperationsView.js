/**
 * Bulk operations view for queue management.
 * Provides UI for selecting and performing operations on multiple queues.
 */
class BulkOperationsView extends EventEmitter {
    constructor(bulkOperations) {
        super();
        this.bulkOperations = bulkOperations;
        this.isVisible = false;
        this.selectedCount = 0;

        this._createUI();
        this._bindEvents();
    }

    /**
     * Creates the bulk operations UI elements.
     */
    _createUI() {
        // Create bulk operations toolbar
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'bulk-operations-toolbar';
        this.toolbar.style.display = 'none'; // Initially hidden

        this.toolbar.innerHTML = `
            <div class="bulk-selection-info">
                <span class="selection-count">0 queues selected</span>
                <button class="btn btn-link" id="bulk-select-all">Select All</button>
                <button class="btn btn-link" id="bulk-clear-selection">Clear</button>
            </div>
            <div class="bulk-actions">
                <div class="bulk-action-group">
                    <label>State:</label>
                    <button class="btn btn-sm btn-secondary" id="bulk-state-running">Set Running</button>
                    <button class="btn btn-sm btn-secondary" id="bulk-state-stopped">Set Stopped</button>
                </div>
                <div class="bulk-action-group">
                    <label>Capacity:</label>
                    <input type="number" class="capacity-input" id="bulk-capacity-value" placeholder="%" min="0" max="100" step="1">
                    <select class="capacity-operation" id="bulk-capacity-operation">
                        <option value="set">Set to</option>
                        <option value="multiply">Multiply by</option>
                        <option value="add">Add</option>
                    </select>
                    <button class="btn btn-sm btn-primary" id="bulk-apply-capacity">Apply</button>
                </div>
                <div class="bulk-action-group">
                    <button class="btn btn-sm btn-danger" id="bulk-delete-queues">Delete Selected</button>
                    <label class="checkbox-label">
                        <input type="checkbox" id="bulk-delete-children"> Include Children
                    </label>
                </div>
            </div>
            <div class="bulk-operations-close">
                <button class="btn btn-link" id="bulk-operations-close">✕</button>
            </div>
        `;

        // Insert toolbar into the main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(this.toolbar, mainContent.firstChild);
        }
    }

    /**
     * Binds event listeners for the bulk operations UI.
     */
    _bindEvents() {
        // Selection controls
        this.toolbar.querySelector('#bulk-select-all').addEventListener('click', () => {
            this._emit('selectAllRequested', null);
        });

        this.toolbar.querySelector('#bulk-clear-selection').addEventListener('click', () => {
            this.bulkOperations.clearSelection();
        });

        // State operations
        this.toolbar.querySelector('#bulk-state-running').addEventListener('click', () => {
            this.bulkOperations.bulkChangeState('RUNNING');
        });

        this.toolbar.querySelector('#bulk-state-stopped').addEventListener('click', () => {
            this.bulkOperations.bulkChangeState('STOPPED');
        });

        // Capacity operations
        this.toolbar.querySelector('#bulk-apply-capacity').addEventListener('click', () => {
            this._handleCapacityOperation();
        });

        // Delete operations
        this.toolbar.querySelector('#bulk-delete-queues').addEventListener('click', () => {
            this._handleDeleteOperation();
        });

        // Close toolbar
        this.toolbar.querySelector('#bulk-operations-close').addEventListener('click', () => {
            this.hide();
        });

        // Listen to bulk operations selection changes
        this.bulkOperations.on('selectionChanged', (data) => {
            this._updateSelectionInfo(data.count);
            this._updateCheckboxStates(data.selected);
        });

        this.bulkOperations.on('operationCompleted', (data) => {
            this._handleOperationCompleted(data);
        });
    }

    /**
     * Shows the bulk operations toolbar with smooth animation.
     */
    show() {
        this.isVisible = true;
        this.toolbar.style.display = 'flex';

        // Trigger animation on next frame to ensure display property is applied first
        requestAnimationFrame(() => {
            this.toolbar.classList.add('show');
        });

        this._emit('visibilityChanged', true);
    }

    /**
     * Hides the bulk operations toolbar with smooth animation.
     */
    hide() {
        this.isVisible = false;
        this.toolbar.classList.remove('show');
        this.bulkOperations.clearSelection();

        // Hide completely after animation
        setTimeout(() => {
            if (!this.isVisible) {
                this.toolbar.style.display = 'none';
            }
        }, 300); // Match CSS transition duration

        this._emit('visibilityChanged', false);
    }

    /**
     * Toggles the visibility of the bulk operations toolbar.
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Updates the selection count display.
     * @param {number} count - Number of selected queues
     */
    _updateSelectionInfo(count) {
        this.selectedCount = count;
        const countElement = this.toolbar.querySelector('.selection-count');

        if (count === 0) {
            countElement.textContent = 'No queues selected';
            this._disableActions();
        } else {
            countElement.textContent = `${count} queue${count === 1 ? '' : 's'} selected`;
            this._enableActions();
        }
    }

    /**
     * Enables action buttons when queues are selected.
     */
    _enableActions() {
        const buttons = this.toolbar.querySelectorAll('.bulk-actions button');
        for (const button of buttons) {
            button.disabled = false;
        }
    }

    /**
     * Disables action buttons when no queues are selected.
     */
    _disableActions() {
        const buttons = this.toolbar.querySelectorAll('.bulk-actions button');
        for (const button of buttons) {
            button.disabled = true;
        }
    }

    /**
     * Handles capacity adjustment operations.
     */
    _handleCapacityOperation() {
        const value = Number(this.toolbar.querySelector('#bulk-capacity-value').value);
        const operation = this.toolbar.querySelector('#bulk-capacity-operation').value;

        if (isNaN(value) || value < 0) {
            alert('Please enter a valid capacity value');
            return;
        }

        if (operation === 'multiply' && value === 0) {
            alert('Multiply value cannot be 0');
            return;
        }

        this.bulkOperations.bulkAdjustCapacity(operation, value);
    }

    /**
     * Handles queue deletion operations.
     */
    _handleDeleteOperation() {
        const includeChildren = this.toolbar.querySelector('#bulk-delete-children').checked;
        const selectedCount = this.bulkOperations.getSelectedQueues().length;

        const message = `Are you sure you want to delete ${selectedCount} queue${selectedCount === 1 ? '' : 's'}?${includeChildren ? ' This will also delete all child queues.' : ''}`;

        if (confirm(message)) {
            this.bulkOperations.bulkDeleteQueues(includeChildren);
        }
    }

    /**
     * Handles completion of bulk operations.
     * @param {Object} data - Operation completion data
     */
    _handleOperationCompleted(data) {
        // Clear form values after operation
        this.toolbar.querySelector('#bulk-capacity-value').value = '';
        this.toolbar.querySelector('#bulk-delete-children').checked = false;

        this._emit('operationCompleted', data);
    }

    /**
     * Adds selection checkbox to queue cards.
     * @param {HTMLElement} queueCard - Queue card element
     * @param {string} queuePath - Queue path
     */
    addSelectionCheckbox(queueCard, queuePath) {
        if (queueCard.querySelector('.bulk-select-checkbox')) {
            return; // Already has checkbox
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'bulk-select-checkbox';
        checkbox.title = 'Select for bulk operations';

        checkbox.addEventListener('change', () => {
            this.bulkOperations.toggleQueue(queuePath);
        });

        // Update checkbox state if queue is already selected
        checkbox.checked = this.bulkOperations.isSelected(queuePath);

        // Add checkbox to queue card header
        const header = queueCard.querySelector('.queue-header');
        if (header) {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'bulk-select-container';
            checkboxContainer.appendChild(checkbox);
            header.insertBefore(checkboxContainer, header.firstChild);
        }
    }

    /**
     * Updates all checkbox states to match the current selection.
     * @param {Array} selectedPaths - Array of currently selected queue paths
     */
    _updateCheckboxStates(selectedPaths) {
        const selectedSet = new Set(selectedPaths);
        const checkboxes = document.querySelectorAll('.bulk-select-checkbox');

        for (const checkbox of checkboxes) {
            const queueCard = checkbox.closest('.queue-card');
            if (queueCard) {
                const queuePath = queueCard.dataset.queuePath;
                checkbox.checked = selectedSet.has(queuePath);
            }
        }
    }

    /**
     * Removes selection checkboxes from all queue cards.
     */
    removeSelectionCheckboxes() {
        const checkboxes = document.querySelectorAll('.bulk-select-checkbox');
        for (const checkbox of checkboxes) {
            const container = checkbox.closest('.bulk-select-container');
            if (container) {
                container.remove();
            }
        }
    }

    /**
     * Updates checkbox states based on current selection.
     */
    updateCheckboxStates() {
        const checkboxes = document.querySelectorAll('.bulk-select-checkbox');
        for (const checkbox of checkboxes) {
            const queueCard = checkbox.closest('.queue-card');
            if (queueCard) {
                const queuePath = queueCard.dataset.queuePath;
                checkbox.checked = this.bulkOperations.isSelected(queuePath);
            }
        }
    }
}
