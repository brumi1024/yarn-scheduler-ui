class InfoQueueModalView extends BaseModalView {
    constructor(controller) {
        super('info-modal', controller);
    }

    /**
     * Renders the content of the Info Queue modal.
     * @param {Object} data - Formatted data object. Expected structure:
     * {
     *   displayName: string,
     *   basicInfo: Array<{label: string, value: string}>,
     *   capacityResourceDetails: Array<{label: string, value: string | Array<string>}>,
     *   liveUsage: Array<{label: string, value: string}>,
     *   nodeLabelInfo: Array<{label: string, value: string}>,
     *   otherConfigured: Array<{label: string, value: string}>
     * }
     */
    _renderContent(data) {
        if (!this.formContainer) {
            console.error('InfoQueueModalView: Form container not found.');
            return;
        }
        DomUtils.empty(this.formContainer);

        if (!data || !data.displayName) {
            this.formContainer.innerHTML = '<p>Queue information not available or queue not found.</p>';
            const modalTitleElement = DomUtils.qs('.modal-title', this.modalEl);
            if (modalTitleElement) modalTitleElement.textContent = 'Queue Info';
            return;
        }

        const modalTitleElement = DomUtils.qs('.modal-title', this.modalEl);
        if (modalTitleElement) modalTitleElement.textContent = `Queue Info: ${DomUtils.escapeXml(data.displayName)}`;

        this.formContainer.innerHTML = this._buildHtml(data);
    }

    _buildSectionHtml(title, items) {
        if (!items || items.length === 0) return '';

        const itemsHtml = items
            .map((item) => {
                let valueDisplay = '';
                if (Array.isArray(item.value)) {
                    // For array values (like capacity breakdown strings)
                    valueDisplay =
                        '<div>' + item.value.map((v) => DomUtils.escapeXml(String(v))).join('</div><div>') + '</div>';
                } else if (item.value === null || item.value === undefined) {
                    valueDisplay = '<em class="text-muted">N/A</em>';
                } else {
                    valueDisplay = DomUtils.escapeXml(String(item.value));
                }
                return `<tr><td class="info-label">${DomUtils.escapeXml(item.label)}</td><td class="info-value">${valueDisplay}</td></tr>`;
            })
            .join('');

        if (!itemsHtml) return ''; // Don't render section if all items resulted in no displayable value

        return `<div class="info-section">
                    <h3 class="info-section-title">${DomUtils.escapeXml(title)}</h3>
                    <table class="info-table">${itemsHtml}</table>
                </div>`;
    }

    _buildHtml(data) {
        let html = '<div class="queue-info-container">';
        html += this._buildSectionHtml('📋 Basic Information', data.basicInfo);
        html += this._buildSectionHtml('📊 Capacity & Resource Details', data.capacityResourceDetails);
        html += this._buildSectionHtml('📈 Live Usage / Runtime', data.liveUsage);
        html += this._buildSectionHtml('🏷️ Node Label Information (Effective Config)', data.nodeLabelInfo);
        html += this._buildSectionHtml('⚙️ Other Configured Properties (Effective)', data.otherConfigured);
        html += '</div>';
        return html;
    }
}
