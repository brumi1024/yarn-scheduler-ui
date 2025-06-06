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
            html += '<h4 class="collapsible-header"><span class="toggle-icon">▼</span> Detailed Changes</h4>';
            html += '<div class="collapsible-content">';
        } else {
            html += '<h4>Detailed Changes</h4>';
        }

        const groupedChanges = this._groupChangesByQueueAndGlobal();
        let totalShown = 0;
        let totalRemaining = 0;
        
        // Show global changes first
        if (groupedChanges.global && groupedChanges.global.length > 0) {
            html += `<div class="change-group global-changes-container">`;
            html += `<h5 class="change-section-header collapsible-header">`;
            html += `<span class="toggle-icon">▼</span>`;
            html += `🌐 Global Scheduler Configuration`;
            html += `<span class="change-count">(${groupedChanges.global.length} change${groupedChanges.global.length !== 1 ? 's' : ''})</span>`;
            html += `</h5>`;
            
            html += `<div class="global-change-content collapsible-content">`;
            
            const globalByOperation = this._groupChangesByOperation(groupedChanges.global);
            const { content: globalContent, shown: globalShown, remaining: globalRemaining } = 
                this._generateOperationSections(globalByOperation, totalShown);
            
            html += globalContent;
            totalShown += globalShown;
            totalRemaining += globalRemaining;
            
            html += '</div>'; // End collapsible-content
            html += '</div>'; // End global-changes-container
        }
        
        // Show queue changes grouped together with collapsible sections
        const queueNames = Object.keys(groupedChanges.queues).sort();
        if (queueNames.length > 0) {
            html += `<div class="change-group queue-changes-container">`;
            html += `<h5 class="change-section-header">📋 Queue Configuration Changes</h5>`;
            
            for (const queuePath of queueNames) {
                const queueChanges = groupedChanges.queues[queuePath];
                if (queueChanges.length === 0) continue;
                
                if (totalShown >= this.options.maxChanges) {
                    totalRemaining += queueChanges.length;
                    continue;
                }
                
                // Individual queue section with collapsible content
                html += `<div class="queue-change-section">`;
                html += `<h6 class="queue-section-header collapsible-header" data-queue="${DomUtils.escapeXml(queuePath)}">`;
                html += `<span class="toggle-icon">▼</span>`;
                html += `<span class="queue-name"><code>${DomUtils.escapeXml(queuePath)}</code></span>`;
                html += `<span class="change-count">(${queueChanges.length} change${queueChanges.length !== 1 ? 's' : ''})</span>`;
                html += `</h6>`;
                
                html += `<div class="queue-change-content collapsible-content">`;
                
                const queueByOperation = this._groupChangesByOperation(queueChanges);
                const { content: queueContent, shown: queueShown, remaining: queueRemaining } = 
                    this._generateOperationSections(queueByOperation, totalShown);
                
                html += queueContent;
                totalShown += queueShown;
                totalRemaining += queueRemaining;
                
                html += '</div>'; // End collapsible-content
                html += '</div>'; // End queue-change-section
                
                if (totalShown >= this.options.maxChanges) break;
            }
            
            html += '</div>'; // End queue-changes-container
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
        
        // Show full YARN property name prominently
        if (fullKey) {
            html += `<div class="change-property">`;
            html += `<code class="full-property-name">${DomUtils.escapeXml(fullKey)}</code>`;
            html += '</div>';
        } else if (queuePath && property) {
            // Construct full property name if not provided
            const constructedFullKey = PropertyKeyMapper.createFullKey(queuePath, property);
            html += `<div class="change-property">`;
            html += `<code class="full-property-name">${DomUtils.escapeXml(constructedFullKey)}</code>`;
            html += '</div>';
        } else if (queuePath && operation === OPERATION_TYPES.ADD) {
            // For queue additions, show operation description
            html += `<div class="change-property">`;
            html += `<span class="operation-description">Add Queue: <strong>${DomUtils.escapeXml(queuePath)}</strong></span>`;
            html += '</div>';
        } else if (queuePath && operation === OPERATION_TYPES.DELETE) {
            // For queue deletions, show operation description
            html += `<div class="change-property">`;
            html += `<span class="operation-description">Delete Queue: <strong>${DomUtils.escapeXml(queuePath)}</strong></span>`;
            html += '</div>';
        }
        
        // Value changes
        if (operation === OPERATION_TYPES.UPDATE || operation === OPERATION_TYPES.ADD) {
            html += '<div class="change-values">';
            
            if (operation === OPERATION_TYPES.UPDATE && oldValue !== undefined) {
                html += `<div class="old-value"><span class="value-label">From:</span> ${DomUtils.escapeXml(String(oldValue))}</div>`;
            }
            
            if (newValue !== undefined && newValue !== 'New Queue') {
                html += `<div class="new-value"><span class="value-label">To:</span> ${DomUtils.escapeXml(String(newValue))}</div>`;
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
     * Groups changes by queue and global configuration.
     * @returns {Object} Grouped changes with global and queues properties
     */
    _groupChangesByQueueAndGlobal() {
        const groups = {
            global: [],
            queues: {}
        };
        
        for (const change of this.changes) {
            // Determine if this is a global change
            const isGlobalChange = this._isGlobalProperty(change.fullKey);
            
            if (isGlobalChange) {
                groups.global.push(change);
            } else {
                // Group by queue path - extract from fullKey if queuePath is missing
                let queuePath = change.queuePath;
                
                // If queuePath is missing but this is a queue property, extract it from fullKey
                if (!queuePath && change.fullKey && change.fullKey.startsWith('yarn.scheduler.capacity.root.')) {
                    queuePath = this._extractQueuePathFromProperty(change.fullKey);
                }
                
                if (!groups.queues[queuePath]) {
                    groups.queues[queuePath] = [];
                }
                groups.queues[queuePath].push(change);
            }
        }
        
        return groups;
    }
    
    /**
     * Determines if a property key represents a global scheduler property.
     * @param {string} propertyKey - The full YARN property key
     * @returns {boolean} True if this is a global property
     * @private
     */
    _isGlobalProperty(propertyKey) {
        // Use centralized PropertyKeyMapper for consistency
        return PropertyKeyMapper.isGlobalProperty(propertyKey);
    }
    
    /**
     * Extracts the queue path from a YARN property key based on actual queue hierarchy.
     * Uses the definitive queue structure from scheduler configuration.
     * @param {string} propertyKey - Full YARN property key
     * @returns {string} The queue path or null if not determinable
     * @private
     */
    _extractQueuePathFromProperty(propertyKey) {
        if (!propertyKey || !propertyKey.startsWith('yarn.scheduler.capacity.root.')) {
            return null;
        }
        
        // Remove the prefix: yarn.scheduler.capacity.root.TEST_C.TEST_AAA.test -> TEST_C.TEST_AAA.test
        const withoutPrefix = propertyKey.substring('yarn.scheduler.capacity.root.'.length);
        const parts = withoutPrefix.split('.');
        
        if (parts.length === 0) {
            return 'root'; // This is a root property
        }
        
        // Try to access the actual queue hierarchy from the scheduler configuration
        const queueHierarchy = this._getQueueHierarchy();
        if (queueHierarchy) {
            // Use definitive queue structure to determine longest valid queue path
            const validQueuePath = this._findLongestValidQueuePath('root', parts, queueHierarchy);
            if (validQueuePath) {
                return validQueuePath;
            }
        }
        
        // Fallback to heuristic-based detection if hierarchy is not available
        return this._extractQueuePathHeuristic(parts);
    }
    
    /**
     * Gets the queue hierarchy from the scheduler configuration.
     * @returns {Object|null} Queue hierarchy object or null if not available
     * @private
     */
    _getQueueHierarchy() {
        try {
            // Try to access global app instance and scheduler configuration
            if (typeof window !== 'undefined' && window.app && window.app.schedulerConfigModel) {
                const config = window.app.schedulerConfigModel.getSchedulerConfig();
                if (config && config.scheduler && config.scheduler['schedulerInfo']) {
                    return config.scheduler['schedulerInfo'];
                }
            }
            
            // Alternative access through global CONFIG if available
            if (typeof window !== 'undefined' && window.schedulerConfig) {
                return window.schedulerConfig;
            }
            
            return null;
        } catch (error) {
            console.warn('Could not access queue hierarchy for property classification:', error);
            return null;
        }
    }
    
    /**
     * Finds the longest valid queue path by checking against actual queue hierarchy.
     * @param {string} currentPath - Current queue path being built
     * @param {Array<string>} remainingParts - Remaining property parts to check
     * @param {Object} queueData - Queue hierarchy data
     * @returns {string|null} Longest valid queue path or null
     * @private
     */
    _findLongestValidQueuePath(currentPath, remainingParts, queueData) {
        if (remainingParts.length === 0) {
            return currentPath;
        }
        
        // Check if current queue has a 'queues' property defining child queues
        const queueInfo = this._findQueueInHierarchy(currentPath, queueData);
        if (!queueInfo || !queueInfo.queues) {
            // No child queues defined, current path is the longest valid
            return currentPath;
        }
        
        // Get list of valid child queue names
        const childQueueNames = queueInfo.queues.queue ? 
            (Array.isArray(queueInfo.queues.queue) ? queueInfo.queues.queue.map(q => q.queueName) : [queueInfo.queues.queue.queueName]) :
            [];
        
        // Check if the next part is a valid child queue
        const nextQueueName = remainingParts[0];
        if (childQueueNames.includes(nextQueueName)) {
            // This is a valid child queue, continue recursively
            const nextPath = currentPath + '.' + nextQueueName;
            return this._findLongestValidQueuePath(nextPath, remainingParts.slice(1), queueData);
        } else {
            // Next part is not a valid child queue, current path is the longest valid
            return currentPath;
        }
    }
    
    /**
     * Finds a specific queue in the hierarchy data.
     * @param {string} queuePath - Queue path to find (e.g., 'root.default.engineering')
     * @param {Object} queueData - Queue hierarchy data
     * @returns {Object|null} Queue information or null if not found
     * @private
     */
    _findQueueInHierarchy(queuePath, queueData) {
        const pathParts = queuePath.split('.');
        let currentQueue = queueData;
        
        // Navigate through the hierarchy following the path
        for (let i = 0; i < pathParts.length; i++) {
            const queueName = pathParts[i];
            
            if (i === 0 && queueName === 'root') {
                // Start at root, continue to next part
                continue;
            }
            
            // Look for this queue name in current level
            if (currentQueue.queues && currentQueue.queues.queue) {
                const queues = Array.isArray(currentQueue.queues.queue) ? currentQueue.queues.queue : [currentQueue.queues.queue];
                const foundQueue = queues.find(q => q.queueName === queueName);
                
                if (foundQueue) {
                    currentQueue = foundQueue;
                } else {
                    return null; // Queue not found in hierarchy
                }
            } else {
                return null; // No child queues at this level
            }
        }
        
        return currentQueue;
    }
    
    /**
     * Fallback heuristic-based queue path extraction when hierarchy is not available.
     * WARNING: This is unreliable and should only be used as last resort.
     * The only reliable way is to check against actual .queues properties.
     * @param {Array<string>} parts - Property parts after removing 'yarn.scheduler.capacity.root.'
     * @returns {string} Best guess queue path
     * @private
     */
    _extractQueuePathHeuristic(parts) {
        // Without access to the actual queue hierarchy, we can only guess
        // This is inherently unreliable since queue names can contain dots
        if (parts.length > 1) {
            return 'root.' + parts.slice(0, -1).join('.');
        }
        
        return 'root';
    }

    /**
     * Groups changes by operation type.
     * @param {Array} changes - Array of changes to group
     * @returns {Object} Changes grouped by operation type
     * @private
     */
    _groupChangesByOperation(changes) {
        const groups = {
            [OPERATION_TYPES.ADD]: [],
            [OPERATION_TYPES.UPDATE]: [],
            [OPERATION_TYPES.DELETE]: []
        };
        
        for (const change of changes) {
            if (groups[change.operation]) {
                groups[change.operation].push(change);
            }
        }
        
        return groups;
    }
    
    /**
     * Generates HTML sections for each operation type.
     * @param {Object} operationGroups - Changes grouped by operation
     * @param {number} currentShown - Number of items already shown
     * @returns {Object} Object with content, shown count, and remaining count
     * @private
     */
    _generateOperationSections(operationGroups, currentShown) {
        let html = '';
        let totalShown = 0;
        let totalRemaining = 0;
        
        // Order: additions, changes, removals
        const operationOrder = [
            { type: OPERATION_TYPES.ADD, title: 'Additions', icon: '➕' },
            { type: OPERATION_TYPES.UPDATE, title: 'Changes', icon: '📝' },
            { type: OPERATION_TYPES.DELETE, title: 'Removals', icon: '🗑️' }
        ];
        
        for (const { type, title, icon } of operationOrder) {
            const changes = operationGroups[type] || [];
            if (changes.length === 0) continue;
            
            const remainingSpace = Math.max(0, this.options.maxChanges - (currentShown + totalShown));
            if (remainingSpace === 0) {
                totalRemaining += changes.length;
                continue;
            }
            
            html += `<div class="operation-subsection">`;
            html += `<h6 class="operation-header">${icon} ${title}</h6>`;
            
            const changesToShow = changes.slice(0, remainingSpace);
            for (const change of changesToShow) {
                html += this._generateChangeItem(change);
                totalShown++;
            }
            
            if (changes.length > changesToShow.length) {
                totalRemaining += changes.length - changesToShow.length;
            }
            
            html += '</div>';
            
            if (totalShown + currentShown >= this.options.maxChanges) break;
        }
        
        return {
            content: html,
            shown: totalShown,
            remaining: totalRemaining
        };
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
                
                if (content && content.classList.contains('collapsible-content')) {
                    const isCollapsed = content.style.display === 'none';
                    content.style.display = isCollapsed ? 'block' : 'none';
                    
                    if (icon) {
                        icon.textContent = isCollapsed ? '▼' : '▶';
                    }
                    
                    // Add visual feedback for collapsed state
                    header.classList.toggle('collapsed', !isCollapsed);
                }
            });
        }
        
        // Set initial state for sections
        const allCollapsibleHeaders = this.container.querySelectorAll('.collapsible-header');
        for (const header of allCollapsibleHeaders) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.toggle-icon');
            
            if (content && content.classList.contains('collapsible-content')) {
                // Check if this is the main "Detailed Changes" header
                const isMainDetailedChanges = header.textContent.includes('Detailed Changes');
                
                if (isMainDetailedChanges) {
                    // Keep main "Detailed Changes" section open
                    content.style.display = 'block';
                    if (icon) icon.textContent = '▼';
                    header.classList.remove('collapsed');
                } else {
                    // Collapse queue and global sections for better overview
                    content.style.display = 'none';
                    if (icon) icon.textContent = '▶';
                    header.classList.add('collapsed');
                }
            }
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
            // Reclassify UPDATE operations as ADD when property wasn't previously configured
            let displayOperation = change.operation;
            
            if (change.operation === OPERATION_TYPES.UPDATE && 
                change.queuePath && 
                change.propertyKey &&
                (change.oldValue === undefined || change.oldValue === null || change.oldValue === '')) {
                // This is setting a property that wasn't explicitly configured before (was using defaults)
                displayOperation = OPERATION_TYPES.ADD;
            }
            
            changes.push({
                id: change.id,
                operation: displayOperation,
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

}