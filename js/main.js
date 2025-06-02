// --- Global State Variables ---
let schedulerTrie = new SchedulerConfigTrie(); // Populated by api.loadSchedulerConfiguration
let availablePartitions = ['']; // TODO node label handling
let currentPartition = '';
let queueStateStore = null;
let viewDataFormatter = null;

// Staging changes for queues
let pendingChanges = new Map();    // TODO only used in modal-info-queue, refactor it

// Staging/State for Modals
let currentEditQueue = null; // Stores the queue object being edited

// Cache for fetched configurations
let liveRawSchedulerConf = null;    // Map of all queue config key-values from scheduler-conf
let isGlobalConfigEditMode = false; // Boolean flag for global config edit state

// UI state
let queueElements = new Map(); // For mapping queue paths to their DOM elements (used by arrow-renderer)
let currentSearchTerm = '';
let currentSort = 'capacity'; // Default sort for queue tree

// --- API Instance ---
const api = new YarnSchedulerAPI(window.location.origin || '', true); // Set true for mocks, false for live

// --- Basic Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
    // Ensure UI component functions are available
    if (typeof showLoading !== 'function' || typeof hideLoading !== 'function' || typeof showError !== 'function') {
        console.error("Core UI functions (showLoading, hideLoading, showError) are not defined. Check script loading order for ui-components.js.");
        // Fallback simple alerts
        window.showLoading = (msg) => console.log("Loading:", msg);
        window.hideLoading = () => console.log("Hide loading.");
        window.showError = (msg) => console.error("Error:", msg);
    }
    
    showLoading('Initializing application...');
    try {
        queueStateStore = new QueueStateStore();
        viewDataFormatter = new QueueViewDataFormatter(queueStateStore, QUEUE_CONFIG_CATEGORIES, Q_PATH_PLACEHOLDER);
        // Initial data load for queue structure (populates the scheduler state store)
        // loadSchedulerConfiguration also calls renderQueueTree via switchTab or directly
        await api.loadSchedulerConfiguration();

        // Initialize event handlers
        // initializeTabNavigation from tab-handler.js
        // initializeEventHandlers from ui-components.js (for non-tab general UI like search, sort, modal bg clicks)
        if (typeof initializeTabNavigation === 'function') initializeTabNavigation();
        else console.error("initializeTabNavigation not found. Check tab-handler.js");

        if (typeof initializeEventHandlers === 'function') initializeEventHandlers();
        else console.error("initializeEventHandlers not found. Check ui-components.js or event-handlers.js");
        
        // Activate the default tab after basic setup
        // switchTab is defined in tab-handler.js
        if (typeof switchTab === 'function') {
            const initialActiveTab = document.querySelector('.nav-tab.active');
            if (initialActiveTab && initialActiveTab.getAttribute('data-tab')) {
                switchTab(initialActiveTab.getAttribute('data-tab'));
            } else if (document.querySelectorAll('.nav-tab').length > 0 && document.querySelectorAll('.nav-tab')[0].getAttribute('data-tab')) {
                // Fallback if no tab is marked active in HTML, activate the first one
                switchTab(document.querySelectorAll('.nav-tab')[0].getAttribute('data-tab'));
            } else {
                // Absolute fallback if no tabs have data-tab or are active
                console.warn("No active tab could be determined. Defaulting display might be needed.");
                // Manually ensure at least queue-config-content is shown if it exists
                const queueConfigPane = document.getElementById('queue-config-content');
                if (queueConfigPane) {
                    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
                    queueConfigPane.style.display = 'block';
                    queueConfigPane.classList.add('active');
                    const qTab = document.querySelector('.nav-tab[data-tab="queue-config-content"]');
                    if(qTab) qTab.classList.add('active');
                    if (typeof renderQueueTree === 'function' && queueStateStore.getQueueHierarchy()) renderQueueTree();
                }
                hideLoading();
            }
        } else {
            console.error("switchTab function not defined. UI might not initialize correctly.");
            hideLoading(); // Hide loading even if switchTab isn't there
        }

    } catch (error) {
        showError(`Failed to initialize application: ${error.message}`);
        console.error('Application initialization failed:', error);
        hideLoading(); 
    }
});