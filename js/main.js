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
let globalSchedulerSettings = null; 
let isGlobalConfigEditMode = false; // State for edit mode

// Metadata for global scheduler configurations
const GLOBAL_CONFIG_CATEGORIES = [
    {
        groupName: 'General Scheduler Settings',
        properties: {
            'yarn.scheduler.capacity.schedule-asynchronously.enable': {
                displayName: 'Asynchronous Scheduler',
                description: 'Enabling this option decouples the scheduling from Node Heartbeats, significantly improving latency.',
                type: 'boolean',
                defaultValue: 'false'
            },
            'yarn.scheduler.capacity.node-locality-delay': {
                displayName: 'Node Locality Delay',
                description: 'Number of scheduling opportunities missed before relaxing locality to node-local. Set to -1 for off.',
                type: 'number',
                defaultValue: '40'
            }
        }
    },
    {
        groupName: 'Global Application Management',
        properties: {
            'yarn.scheduler.capacity.maximum-am-resource-percent': {
                displayName: 'Max AM Resource Percent (Global)',
                description: 'Maximum percentage of cluster resources that can be used for Application Masters. Applies if not overridden by queue-specific settings.',
                type: 'percentage',
                defaultValue: '0.1'
            }
            // Example: if there was a global maximum-applications setting
            // 'yarn.scheduler.capacity.maximum-applications': {
            //     displayName: 'Maximum Applications (Global)',
            //     description: 'Total number of applications that can be active or pending in the cluster.',
            //     type: 'number',
            //     defaultValue: '10000'
            // }
        }
    },
    {
        groupName: 'Global Queue Defaults',
        properties: {
            'yarn.scheduler.capacity.user-limit-factor': {
                displayName: 'User Limit Factor (Global Default)',
                description: 'Default factor for calculating user resource limits within queues. Queues can override this.',
                type: 'number',
                defaultValue: '1'
            }
        }
    }
    // Add other groups and their properties
];

// Create global API instance
const api = new YarnSchedulerAPI(window.location.origin || '', true);

window.addEventListener('DOMContentLoaded', function() {
    showLoading('Initializing application...');
    try {
        api.loadSchedulerConfiguration().then(() => {
            switchTab('queue-config-content'); // Activate default tab
        });
        initializeEventHandlers();
    } catch (error) {
        showError(`Failed to initialize application: ${error.message}`);
        console.error('Application initialization failed:', error);
    }
});

function switchTab(targetTabId) {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const queueControls = document.getElementById('queue-config-controls');
    // const batchControls = document.getElementById('batch-controls'); // Handled by updateBatchControls
    const globalConfigActions = document.getElementById('global-config-actions');

    let activeTabFound = false;

    navTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === targetTabId) {
            tab.classList.add('active');
            activeTabFound = true;
        } else {
            tab.classList.remove('active');
        }
    });

    if (!activeTabFound && navTabs.length > 0) {
        navTabs[0].classList.add('active');
        targetTabId = navTabs[0].getAttribute('data-tab');
    }
    
    tabPanes.forEach(pane => {
        if (pane.id === targetTabId) {
            pane.style.display = 'block';
            pane.classList.add('active');
        } else {
            pane.style.display = 'none';
            pane.classList.remove('active');
        }
    });

    if (queueControls) queueControls.style.display = (targetTabId === 'queue-config-content' ? 'flex' : 'none');
    updateBatchControls(); 
    if (globalConfigActions) globalConfigActions.style.visibility = (targetTabId === 'scheduler-config-content' ? 'visible' : 'hidden');


    if (targetTabId === 'queue-config-content') {
        if (queueData) renderQueueTree();
        showContent(true); 
    } else if (targetTabId === 'scheduler-config-content') {
        isGlobalConfigEditMode = false; 
        renderSchedulerConfigurationPage();
        hideLoading();
    } else if (targetTabId === 'placement-rules-content') {
        console.log("Placement Rules tab selected");
        hideLoading();
    } else if (targetTabId === 'node-labels-content') {
        console.log("Node Labels tab selected");
        hideLoading();
    }
}

async function renderSchedulerConfigurationPage() {
    const container = document.getElementById('global-scheduler-settings-container');
    if (!container) return;

    const editBtn = document.getElementById('edit-global-config-btn');
    const saveBtn = document.getElementById('save-global-config-btn');
    const cancelBtn = document.getElementById('cancel-global-config-btn');

    if (isGlobalConfigEditMode) {
        if (editBtn) editBtn.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
    } else {
        if (editBtn) editBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }
    
    showLoading('Loading global scheduler settings...');
    container.innerHTML = ''; 

    try {
        if (!globalSchedulerSettings) {
            const rawConf = await api.getSchedulerConf(); //
            if (rawConf && rawConf.property) {
                globalSchedulerSettings = new Map(rawConf.property.map(p => [p.name, p.value]));
            } else {
                globalSchedulerSettings = new Map();
                showWarning("Could not fetch live global settings, or none are set. Displaying defaults."); //
            }
        }

        if (GLOBAL_CONFIG_CATEGORIES.length === 0) {
            container.innerHTML = '<p>No global scheduler settings categories are defined in the UI.</p>';
            if (editBtn) editBtn.disabled = true;
            hideLoading();
            return;
        }
        if (editBtn) editBtn.disabled = false;
        
        let html = ''; 

        GLOBAL_CONFIG_CATEGORIES.forEach(group => {
            if (Object.keys(group.properties).length > 0) {
                html += `<div class="config-group">`;
                html += `<h3 class="config-group-title">${group.groupName}</h3>`;

                for (const propName in group.properties) {
                    if (Object.hasOwnProperty.call(group.properties, propName)) {
                        const metadata = group.properties[propName];
                        const liveValue = globalSchedulerSettings.get(propName);
                        const currentValue = liveValue !== undefined ? liveValue : metadata.defaultValue;
                        const isDefaultUsed = liveValue === undefined;

                        const inputId = `global-config-${propName.replace(/\./g, '-')}`;
                        const displayNameSuffix = isDefaultUsed && !isGlobalConfigEditMode ? ' <em class="default-value-indicator">(default)</em>' : '';

                        html += `<div class="config-item" data-property-name="${propName}">
                                    <div class="config-item-col-left">
                                        <div class="config-display-name">${metadata.displayName}${displayNameSuffix}</div>
                                        <div class="config-yarn-property">${propName}</div>
                                    </div>
                                    <div class="config-item-col-middle config-description">
                                        ${metadata.description}
                                    </div>
                                    <div class="config-item-col-right config-item-value-control">`;

                        if (isGlobalConfigEditMode) {
                            const originalValueForEdit = currentValue; 
                            if (metadata.type === "boolean") {
                                html += `<select id="${inputId}" class="config-value-input" data-original-value="${originalValueForEdit}">
                                            <option value="true" ${currentValue === "true" ? "selected" : ""}>true</option>
                                            <option value="false" ${currentValue === "false" ? "selected" : ""}>false</option>
                                         </select>`;
                            } else if (metadata.type === "number" || metadata.type === "percentage") {
                                html += `<input type="number" id="${inputId}" class="config-value-input" value="${currentValue}" data-original-value="${originalValueForEdit}" ${metadata.type === "percentage" ? 'step="0.01"' : ''}>`;
                            } else { 
                                html += `<input type="text" id="${inputId}" class="config-value-input" value="${currentValue}" data-original-value="${originalValueForEdit}">`;
                            }
                        } else {
                            html += `<span class="config-value-display">${currentValue}</span>`;
                        }
                        html += `       </div> 
                                  </div>`; 
                    }
                }
                html += `</div>`; // Close config-group
            }
        });
        
        if (html === '') { // Handles case where categories are defined but all have empty properties
            container.innerHTML = '<p>No global scheduler settings are configured for display.</p>';
            if (editBtn) editBtn.disabled = true;
        } else {
            container.innerHTML = html;
        }
        hideLoading();

    } catch (error) {
        container.innerHTML = `<p>Error loading global scheduler settings: ${error.message}</p>`;
        showError(`Failed to render global scheduler settings: ${error.message}`); //
        hideLoading();
    }
}

function toggleGlobalConfigEditMode(editMode) {
    isGlobalConfigEditMode = editMode;
    renderSchedulerConfigurationPage();
}

async function saveGlobalSchedulerSettings() {
    const globalUpdatesPayload = { params: {} };
    let changesMade = 0;

    if (!globalSchedulerSettings) {
        try {
            const rawConf = await api.getSchedulerConf(); //
            if (rawConf && rawConf.property) {
                globalSchedulerSettings = new Map(rawConf.property.map(p => [p.name, p.value]));
            } else {
                globalSchedulerSettings = new Map();
            }
        } catch (e) {
            globalSchedulerSettings = new Map(); 
            showError("Could not verify current settings before saving. Proceeding with UI values."); //
        }
    }

    const configItems = document.querySelectorAll('#global-scheduler-settings-container .config-item');
    configItems.forEach(item => {
        const propName = item.getAttribute('data-property-name');
        const inputElement = item.querySelector('.config-value-input'); 
        
        // Check if propName exists in any of the defined categories and their properties
        let metadataExists = false;
        for (const group of GLOBAL_CONFIG_CATEGORIES) {
            if (group.properties[propName]) {
                metadataExists = true;
                break;
            }
        }

        if (inputElement && metadataExists) {
            const newValue = inputElement.value;
            const originalValueDisplayed = inputElement.getAttribute('data-original-value'); 

            if (newValue !== originalValueDisplayed) {
                globalUpdatesPayload.params[propName] = newValue;
                changesMade++;
            }
        }
    });

    if (changesMade === 0) {
        showInfo("No changes to save."); //
        toggleGlobalConfigEditMode(false); 
        return;
    }

    showLoading("Saving global settings..."); //
    try {
        const response = await api.makeConfigurationUpdateApiCall({ globalUpdates: [globalUpdatesPayload] }); //
        if (response && response.status === 200 && typeof response.data === "string" && response.data.includes("successfully applied")) {
            showSuccess("Global settings saved successfully!"); //
            globalSchedulerSettings = null; 
            toggleGlobalConfigEditMode(false); 
        } else {
            const errorMessage = response && response.data ? (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)) : "Unknown error";
            showError(`Failed to save global settings: ${errorMessage}`); //
        }
    } catch (error) {
        showError(`Error saving global settings: ${error.message}`); //
    } finally {
        hideLoading();
    }
}

function refreshQueues() {
    const totalChanges = pendingChanges.size + pendingAdditions.size + pendingDeletions.size;
    const activeTabId = document.querySelector('.nav-tab.active')?.getAttribute('data-tab');

    if (activeTabId === 'queue-config-content' && totalChanges > 0) {
        if (!confirm('You have pending queue changes. Refreshing will discard them. Continue?')) {
            return;
        }
        pendingChanges.clear();
        pendingAdditions.clear();
        pendingDeletions.clear();
        updateBatchControls();
    }
    
    if (isGlobalConfigEditMode && activeTabId === 'scheduler-config-content') {
         if (!confirm('You are in edit mode for global settings. Refreshing will discard unsaved changes. Continue?')) {
            return;
        }
    }

    if (activeTabId === 'queue-config-content') {
        api.loadSchedulerConfiguration();
    } else if (activeTabId === 'scheduler-config-content') {
        globalSchedulerSettings = null; 
        isGlobalConfigEditMode = false; 
        renderSchedulerConfigurationPage(); 
    }
}

function discardChanges() { 
    if (confirm('Are you sure you want to discard all pending queue changes?')) {
        pendingChanges.clear();
        pendingAdditions.clear();
        pendingDeletions.clear();
        renderQueueTree(); 
        updateBatchControls(); 
    }
}

// Export functions to the global window object
window.api = api;
window.refreshQueues = refreshQueues;
window.discardChanges = discardChanges;
window.toggleGlobalConfigEditMode = toggleGlobalConfigEditMode;
window.saveGlobalSchedulerSettings = saveGlobalSchedulerSettings;
