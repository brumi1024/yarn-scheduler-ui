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
let globalSchedulerSettings = null; // To store fetched global settings

// Create global API instance
const api = new YarnSchedulerAPI(window.location.origin || '', true);

window.addEventListener('DOMContentLoaded', function() {
    showLoading('Initializing application...');
    try {
        api.loadSchedulerConfiguration().then(() => {
             // Ensure default tab (Queue Configuration) content is shown after loading
            switchTab('queue-config-content');
        });
        initializeEventHandlers(); // Initialize event handlers including tab switching
    } catch (error) {
        showError(`Failed to initialize application: ${error.message}`);
        console.error('Application initialization failed:', error);
    }
});

function switchTab(targetTabId) {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const queueControls = document.getElementById('queue-config-controls');
    const batchControls = document.getElementById('batch-controls');

    let activeTabFound = false;

    navTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === targetTabId) {
            tab.classList.add('active');
            activeTabFound = true;
        } else {
            tab.classList.remove('active');
        }
    });

    // Fallback if targetTabId is not found (e.g. on initial load with no hash)
    if (!activeTabFound && navTabs.length > 0) {
        navTabs[0].classList.add('active');
        targetTabId = navTabs[0].getAttribute('data-tab');
    }
    
    tabPanes.forEach(pane => {
        if (pane.id === targetTabId) {
            pane.style.display = 'block';
            pane.classList.add('active'); // Ensure class active is also set
        } else {
            pane.style.display = 'none';
            pane.classList.remove('active');
        }
    });

    // Show/hide queue-specific controls and batch controls
    if (targetTabId === 'queue-config-content') {
        if (queueControls) queueControls.style.display = 'flex';
        if (batchControls) batchControls.style.display = pendingChanges.size + pendingAdditions.size + pendingDeletions.size > 0 ? 'flex' : 'none';
         if (queueData) { // Only render if queueData is loaded
            renderQueueTree(); // Re-render queue tree when switching to its tab
        }
        showContent(true); // This is a general function, ensure it aligns with tab logic
    } else {
        if (queueControls) queueControls.style.display = 'none';
        if (batchControls) batchControls.style.display = 'none'; // Hide batch controls for other tabs
    }

    if (targetTabId === 'scheduler-config-content') {
        renderSchedulerConfigurationPage();
    } else if (targetTabId === 'placement-rules-content') {
        // Placeholder for placement rules rendering logic
        console.log("Placement Rules tab selected");
    } else if (targetTabId === 'node-labels-content') {
        // Placeholder for node labels rendering logic
        console.log("Node Labels tab selected");
    }
    
    // If not the queue config tab, ensure the general loading state is managed appropriately
    if (targetTabId !== 'queue-config-content') {
        hideLoading(); // Hide general loading if other tabs are shown
    }
}


async function renderSchedulerConfigurationPage() {
    const container = document.getElementById('global-scheduler-settings-container');
    if (!container) return;

    showLoading('Loading global scheduler settings...');
    container.innerHTML = ''; // Clear previous content

    try {
        if (!globalSchedulerSettings) { // Fetch only if not already fetched
            globalSchedulerSettings = await api.getSchedulerConf();
        }

        if (!globalSchedulerSettings || !globalSchedulerSettings.property) {
            container.innerHTML = '<p>No global scheduler settings found or failed to load.</p>';
            showError('No global scheduler settings data available.');
            return;
        }

        const properties = globalSchedulerSettings.property;
        const globalProps = properties.filter(prop => {
            // Filter out yarn.scheduler.capacity.root properties (they are queue specific for root)
            // and properties that are clearly queue-specific.
            // A simple check: if it doesn't have '.root.' followed by more segments, or it's explicitly global.
            const name = prop.name;
            if (name.startsWith('yarn.scheduler.capacity.root.') && name.split('.').length > 4) {
                 // e.g. yarn.scheduler.capacity.root.default.capacity is specific to 'default' queue under root
                return false;
            }
            // Specific known global prefixes or exact names
            if (name.startsWith('yarn.scheduler.capacity.schedule-asynchronously') ||
                name.startsWith('yarn.scheduler.capacity.legacy-queue-mode') ||
                name === 'yarn.scheduler.capacity.maximum-applications' && !name.includes('.root.')) { // True global max apps
                return true;
            }
            // Filter out versioning or purely informational properties not meant for user config display
            if (name.includes('mutation-api.version')) {
                return false;
            }
            // If it's a root level config for root queue itself, it's not "global scheduler setting" for this page's purpose
            if (name.startsWith('yarn.scheduler.capacity.root.') && name.split('.').length <= 4) {
                 // e.g. yarn.scheduler.capacity.root.capacity is for the root queue
                return false;
            }
            // Tentative: if it does not contain '.root.' at all, it might be global.
            // This needs refinement based on actual global properties available.
            return !name.includes('.root.');
        });


        if (globalProps.length === 0) {
            container.innerHTML = '<p>No global scheduler settings found in the current configuration that can be displayed here.</p>';
            hideLoading();
            return;
        }
        
        // Categorize properties
        const categorizedProps = {
            "General Scheduler Settings": [],
            "Resource Allocation": [],
            "Global Application Limits": [],
            "Queue Behavior Defaults": [],
            "Other Global Settings": []
        };

        globalProps.forEach(prop => {
            if (prop.name.includes('schedule-asynchronously') || prop.name.includes('multi-node-placement-enabled')) {
                categorizedProps["General Scheduler Settings"].push(prop);
            } else if (prop.name.includes('resource-calculator')) {
                categorizedProps["Resource Allocation"].push(prop);
            } else if (prop.name.includes('maximum-applications') && !prop.name.includes('.root.')) {
                categorizedProps["Global Application Limits"].push(prop);
            } else if (prop.name.includes('legacy-queue-mode')) {
                categorizedProps["Queue Behavior Defaults"].push(prop);
            } else {
                categorizedProps["Other Global Settings"].push(prop);
            }
        });

        let html = '';
        for (const category in categorizedProps) {
            if (categorizedProps[category].length > 0) {
                html += `<div class="config-group">`;
                html += `<h3 class="config-group-title">${category}</h3>`;
                categorizedProps[category].forEach(prop => {
                    html += `<div class="config-item">
                                <span class="config-key">${prop.name}</span>
                                <span class="config-value">${prop.value}</span>
                             </div>`;
                });
                html += `</div>`;
            }
        }
        container.innerHTML = html;
        hideLoading();

    } catch (error) {
        container.innerHTML = `<p>Error loading global scheduler settings: ${error.message}</p>`;
        showError(`Failed to render global scheduler settings: ${error.message}`);
        hideLoading();
    }
}


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
    // Determine which data to refresh based on the active tab
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        const activeTabId = activeTab.getAttribute('data-tab');
        if (activeTabId === 'queue-config-content') {
            api.loadSchedulerConfiguration(); // Reloads queue hierarchy and re-renders
        } else if (activeTabId === 'scheduler-config-content') {
            globalSchedulerSettings = null; // Force re-fetch
            renderSchedulerConfigurationPage();
        }
        // Add conditions for other tabs if they also need data refresh
    } else { // Default to queue configuration if no tab is active (should not happen)
        api.loadSchedulerConfiguration();
    }
}

function discardChanges() {
    if (confirm('Are you sure you want to discard all pending changes?')) {
        pendingChanges.clear();
        pendingAdditions.clear();
        pendingDeletions.clear();
        renderQueueTree(); // Re-render to reflect cleared changes
        updateBatchControls(); // Update batch controls visibility and count
    }
}

// Export functions to the global window object
window.api = api;
window.refreshQueues = refreshQueues;
window.discardChanges = discardChanges;
window.renderSchedulerConfigurationPage = renderSchedulerConfigurationPage; // If needed globally