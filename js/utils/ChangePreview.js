/**
 * Change preview utility for showing users what modifications will be applied.
 * Provides visual diff and summary of pending changes.
 */
class ChangePreview {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showDiff: true,
            showSummary: true,
            collapsible: true,
            maxChanges: 20,
            ...options
        };
        
        this.changes = [];
        this.rendered = false;
    }

    /**
     * Sets the changes to preview.
     * @param {Array} changes - Array of change objects
     */
    setChanges(changes) {
        this.changes = changes || [];
        if (this.rendered) {
            this.render();
        }
    }

    /**
     * Adds a single change to the preview.
     * @param {Object} change - Change object
     */
    addChange(change) {
        this.changes.push(change);
        if (this.rendered) {
            this.render();
        }
    }

    /**
     * Removes a change from the preview.
     * @param {string} changeId - Change ID to remove
     */
    removeChange(changeId) {
        this.changes = this.changes.filter(c => c.id !== changeId);
        if (this.rendered) {
            this.render();
        }
    }

    /**
     * Clears all changes from preview.
     */
    clear() {
        this.changes = [];
        if (this.rendered) {
            this.render();
        }
    }

    /**
     * Renders the change preview.
     */
    render() {
        if (!this.container) return;
        
        DomUtils.empty(this.container);
        this.rendered = true;

        if (this.changes.length === 0) {
            this.container.innerHTML = '<p class="no-changes">No changes to preview</p>';
            return;
        }

        let html = '<div class="change-preview">';
        
        if (this.options.showSummary) {
            html += this._generateSummary();
        }

        if (this.options.showDiff) {
            html += this._generateDiff();
        }

        html += '</div>';
        this.container.innerHTML = html;
        
        if (this.options.collapsible) {
            this._bindCollapsibleEvents();
        }
    }

    /**
     * Generates summary section of changes.
     * @returns {string} Summary HTML
     */
    _generateSummary() {
        const summary = this._calculateSummary();
        
        let html = '<div class="change-summary">';
        html += '<h4>Change Summary</h4>';
        html += '<div class="summary-stats">';
        
        if (summary.additions > 0) {
            html += `<span class="stat addition">+${summary.additions} added</span>`;
        }
        if (summary.modifications > 0) {
            html += `<span class="stat modification">${summary.modifications} modified</span>`;
        }
        if (summary.deletions > 0) {
            html += `<span class="stat deletion">-${summary.deletions} deleted</span>`;
        }
        
        html += '</div>';
        
        // Queue-specific summary
        if (summary.queueChanges.size > 0) {
            html += '<div class="affected-queues">';
            html += '<strong>Affected Queues:</strong> ';
            html += Array.from(summary.queueChanges).map(queue => 
                `<code>${DomUtils.escapeXml(queue)}</code>`
            ).join(', ');
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Generates detailed diff section.
     * @returns {string} Diff HTML
     */
    _generateDiff() {
        let html = '<div class="change-diff">';
        
        if (this.options.collapsible) {
            html += '<h4 class="collapsible-header">Detailed Changes <span class="toggle-icon">▼</span></h4>';
            html += '<div class="collapsible-content">';
        } else {
            html += '<h4>Detailed Changes</h4>';
        }

        const groupedChanges = this._groupChangesByType();
        let totalShown = 0;
        let totalRemaining = 0;
        
        for (const [type, changes] of Object.entries(groupedChanges)) {
            if (changes.length === 0) continue;
            
            html += `<div class="change-group">`;
            html += `<h5 class="change-type-header">${this._getTypeDisplayName(type)}</h5>`;
            
            const canShow = Math.max(0, this.options.maxChanges - totalShown);
            const changesToShow = changes.slice(0, canShow);
            
            for (const change of changesToShow) {
                html += this._generateChangeItem(change);
                totalShown++;
            }
            
            if (changes.length > changesToShow.length) {
                totalRemaining += changes.length - changesToShow.length;
            }
            
            html += '</div>';
            
            if (totalShown >= this.options.maxChanges) break;
        }
        
        if (totalRemaining > 0) {
            html += `<div class="more-changes">... and ${totalRemaining} more changes</div>`;
        }

        if (this.options.collapsible) {
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Generates HTML for a single change item.
     * @param {Object} change - Change object
     * @returns {string} Change item HTML
     */
    _generateChangeItem(change) {
        const { operation, queuePath, property, oldValue, newValue, fullKey } = change;
        
        let html = `<div class="change-item ${operation}">`;
        html += '<div class="change-icon">' + this._getOperationIcon(operation) + '</div>';
        html += '<div class="change-details">';
        
        // Queue and property info
        if (queuePath) {
            html += `<div class="change-location">`;
            html += `<strong>Queue:</strong> <code>${DomUtils.escapeXml(queuePath)}</code>`;
            if (property) {
                html += ` → <strong>${DomUtils.escapeXml(property)}</strong>`;
            }
            html += '</div>';
        } else if (fullKey) {
            html += `<div class="change-location">`;
            html += `<strong>Property:</strong> <code>${DomUtils.escapeXml(fullKey)}</code>`;
            html += '</div>';
        }
        
        // Value changes
        if (operation === OPERATION_TYPES.UPDATE || operation === OPERATION_TYPES.ADD) {
            html += '<div class="change-values">';
            
            if (operation === OPERATION_TYPES.UPDATE && oldValue !== undefined) {
                html += `<div class="old-value">- ${DomUtils.escapeXml(String(oldValue))}</div>`;
            }
            
            if (newValue !== undefined) {
                html += `<div class="new-value">+ ${DomUtils.escapeXml(String(newValue))}</div>`;
            }
            
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    }

    /**
     * Calculates summary statistics for changes.
     * @returns {Object} Summary statistics
     */
    _calculateSummary() {
        const summary = {
            additions: 0,
            modifications: 0,
            deletions: 0,
            queueChanges: new Set()
        };
        
        for (const change of this.changes) {
            switch (change.operation) {
                case OPERATION_TYPES.ADD:
                    summary.additions++;
                    break;
                case OPERATION_TYPES.UPDATE:
                    summary.modifications++;
                    break;
                case OPERATION_TYPES.DELETE:
                    summary.deletions++;
                    break;
            }
            
            if (change.queuePath) {
                summary.queueChanges.add(change.queuePath);
            }
        }
        
        return summary;
    }

    /**
     * Groups changes by operation type.
     * @returns {Object} Grouped changes
     */
    _groupChangesByType() {
        const groups = {
            [OPERATION_TYPES.ADD]: [],
            [OPERATION_TYPES.UPDATE]: [],
            [OPERATION_TYPES.DELETE]: []
        };
        
        for (const change of this.changes) {
            if (groups[change.operation]) {
                groups[change.operation].push(change);
            }
        }
        
        return groups;
    }

    /**
     * Gets display name for operation type.
     * @param {string} type - Operation type
     * @returns {string} Display name
     */
    _getTypeDisplayName(type) {
        switch (type) {
            case OPERATION_TYPES.ADD:
                return 'Additions';
            case OPERATION_TYPES.UPDATE:
                return 'Modifications';
            case OPERATION_TYPES.DELETE:
                return 'Deletions';
            default:
                return 'Other Changes';
        }
    }

    /**
     * Gets icon for operation type.
     * @param {string} operation - Operation type
     * @returns {string} Icon character
     */
    _getOperationIcon(operation) {
        switch (operation) {
            case OPERATION_TYPES.ADD:
                return '+';
            case OPERATION_TYPES.UPDATE:
                return '~';
            case OPERATION_TYPES.DELETE:
                return '-';
            default:
                return '•';
        }
    }

    /**
     * Binds events for collapsible functionality.
     */
    _bindCollapsibleEvents() {
        const headers = this.container.querySelectorAll('.collapsible-header');
        
        for (const header of headers) {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.toggle-icon');
                
                if (content && icon) {
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                    icon.textContent = content.style.display === 'none' ? '▶' : '▼';
                }
            });
        }
    }

    /**
     * Converts ChangeLog to preview format.
     * @param {ChangeLog} changeLog - ChangeLog instance
     * @returns {Array} Array of changes for preview
     */
    static fromChangeLog(changeLog) {
        const changes = [];
        const allChanges = changeLog.getChanges();
        
        for (const change of allChanges) {
            changes.push({
                id: change.id,
                operation: change.operation,
                queuePath: change.queuePath,
                property: change.propertyKey ? PropertyKeyMapper.toSimpleKey(change.propertyKey) : null,
                fullKey: change.propertyKey,
                oldValue: change.oldValue,
                newValue: change.newValue,
                timestamp: change.timestamp
            });
        }
        
        return changes;
    }

    /**
     * Converts legacy pending changes to preview format.
     * @param {Object} pendingChanges - Legacy pending changes object
     * @returns {Array} Array of changes for preview
     */
    static fromLegacyPendingChanges(pendingChanges) {
        const changes = [];
        
        // Process queue additions
        if (pendingChanges.addQueues) {
            for (const queueData of pendingChanges.addQueues) {
                changes.push({
                    id: `add-${queueData.queueName}`,
                    operation: OPERATION_TYPES.ADD,
                    queuePath: queueData.queueName,
                    property: null,
                    newValue: 'New Queue'
                });
                
                // Add property changes for the new queue
                for (const [key, value] of Object.entries(queueData.params)) {
                    // Skip UI helper fields that should not be shown to users
                    if (key === '_ui_capacityMode') continue;
                    
                    changes.push({
                        id: `add-${queueData.queueName}-${key}`,
                        operation: OPERATION_TYPES.ADD,
                        queuePath: queueData.queueName,
                        property: key,
                        newValue: value
                    });
                }
            }
        }
        
        // Process queue deletions
        if (pendingChanges.removeQueues) {
            for (const queuePath of pendingChanges.removeQueues) {
                changes.push({
                    id: `delete-${queuePath}`,
                    operation: OPERATION_TYPES.DELETE,
                    queuePath: queuePath,
                    property: null,
                    oldValue: 'Queue'
                });
            }
        }
        
        // Process queue updates
        if (pendingChanges.updateQueues) {
            for (const queueData of pendingChanges.updateQueues) {
                for (const [key, value] of Object.entries(queueData.params)) {
                    // Skip UI helper fields that should not be shown to users
                    if (key === '_ui_capacityMode') continue;
                    
                    changes.push({
                        id: `update-${queueData.queueName}-${key}`,
                        operation: OPERATION_TYPES.UPDATE,
                        queuePath: queueData.queueName,
                        property: key,
                        newValue: value
                    });
                }
            }
        }
        
        return changes;
    }
}