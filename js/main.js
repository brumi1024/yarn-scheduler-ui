// Global state
let queueData = null;
let availablePartitions = [''];
let currentPartition = '';
let currentEditQueue = null;
let queueElements = new Map();
let currentSearchTerm = '';
let currentSort = 'capacity';

// Create global API instance
const api = new YarnSchedulerAPI(window.location.origin || '', true);

window.addEventListener('DOMContentLoaded', function() {
    showLoading('Initializing application...');
    try {
        api.loadSchedulerConfiguration();
        initializeEventHandlers();
    } catch (error) {
        showError(`Failed to initialize application: ${error.message}`);
        console.error('Application initialization failed:', error);
    }
});

// Global functions for HTML onclick handlers
function refreshQueues() {
    if (0 < pendingChanges.size()) {
        if (!confirm('You have pending changes. Refreshing will discard them. Continue?')) {
            return;
        }
        pendingChanges.clear();
    }

    api.loadSchedulerConfiguration();
}

function discardChanges() {
    if (confirm('Are you sure you want to discard all pending changes?')) {
        pendingChanges.clear();
        renderQueueTree();
    }
}

// Export functions to the global window object
window.api = api;
window.refreshQueues = refreshQueues;
window.discardChanges = discardChanges;
