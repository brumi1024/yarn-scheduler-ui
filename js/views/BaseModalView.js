class BaseModalView extends EventEmitter {
    /**
     * @param {string} modalId - The ID of the modal DOM element.
     * @param {MainController} controller - The main controller instance.
     * @param {string} [closeButtonSelector='.close-btn'] - Selector for the close button.
     */
    constructor(modalId, controller, closeButtonSelector = '.close-btn') {
        super();
        this.modalId = modalId;
        this.modalEl = DomUtils.getById(modalId);
        this.controller = controller; // To emit events to the controller

        if (!this.modalEl) {
            console.error(`BaseModalView: Modal element with ID "${modalId}" not found.`);
            return;
        }
        this.closeBtn = DomUtils.qs(closeButtonSelector, this.modalEl);
        this.formContainer = DomUtils.getById(this._getFormContainerId()); // e.g., 'edit-form-container'

        this._boundHandleClose = this.hide.bind(this, { Canceled: true });
        this._boundHandleOverlayClick = this._handleOverlayClick.bind(this);

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this._boundHandleClose);
        }
        this.modalEl.addEventListener('click', this._boundHandleOverlayClick);
    }

    // To be overridden by subclasses if their form container ID differs
    _getFormContainerId() {
        if (this.modalId === 'edit-modal') return 'edit-form-container';
        if (this.modalId === 'add-queue-modal') return 'add-form-container';
        if (this.modalId === 'info-modal') return 'info-form-container';
        return '';
    }


    _handleOverlayClick(event) {
        if (event.target === this.modalEl) {
            this.hide({ Canceled: true });
        }
    }

    /**
     * Shows the modal.
     * @param {Object} [dataForRender] - Data to be passed to _renderContent.
     */
    show(dataForRender) {
        if (!this.modalEl) return;
        if (this._renderContent && typeof this._renderContent === 'function') {
            this._renderContent(dataForRender);
        }
        this.modalEl.classList.add('show');
        this._emit('modalShown', this.modalId); // Emit specific event for controller
    }

    /**
     * Hides the modal.
     * @param {Object} [reason = { Canceled: true }] - An object indicating why the modal was hidden
     */
    hide(reason = { Canceled: true }) {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('show');
        this._emit('modalHidden', { modalId: this.modalId, reason });
    }

    /**
     * Placeholder for content rendering, to be implemented by subclasses.
     * This method should populate `this.formContainer`.
     * @param {Object} [data] - Data needed to render the modal's content.
     * @protected
     */
    _renderContent(data) {
        // Example: if (this.formContainer) DomUtils.empty(this.formContainer);
        //          this.formContainer.innerHTML = this._buildHtml(data);
        //          this._bindFormEvents(); // if form has interactive elements
        console.warn(`BaseModalView._renderContent() not implemented by subclass for modal: ${this.modalId}`);
    }

    /**
     * Helper for subclasses to build their HTML string.
     * @param {Object} data
     * @returns {string}
     * @protected
     */
    _buildHtml(data) {
        return "<p>Modal content not implemented.</p>";
    }

    /**
     * Placeholder for subclasses to bind events to their specific form elements.
     * @protected
     */
    _bindFormEvents() {
        // e.g., submit buttons, input changes
    }

    destroy() {
        if (this.closeBtn) {
            this.closeBtn.removeEventListener('click', this._boundHandleClose);
        }
        if (this.modalEl) {
            this.modalEl.removeEventListener('click', this._boundHandleOverlayClick);
        }
        this._emit('destroyed');
        this.events = {}; // Clear listeners
    }
}