// Global state
let queueData = null;
let availablePartitions = [''];
let currentPartition = '';
let pendingChanges = new Map();
let pendingAdditions = new Map();
let pendingDeletions = new Set();
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
    const totalChanges = pendingChanges.size + pendingAdditions.size + pendingDeletions.size;
    if (totalChanges > 0) {
        if (!confirm('You have pending changes. Refreshing will discard them. Continue?')) {
            return;
        }
        pendingChanges.clear();
        pendingAdditions.clear();
        pendingDeletions.clear();
    }

    api.loadSchedulerConfiguration();
}

function discardChanges() {
    if (confirm('Are you sure you want to discard all pending changes?')) {
        pendingChanges.clear();
        pendingAdditions.clear();
        pendingDeletions.clear();
        renderQueueTree();
    }
}

// Export functions to the global window object
window.api = api;
window.refreshQueues = refreshQueues;
window.discardChanges = discardChanges;
