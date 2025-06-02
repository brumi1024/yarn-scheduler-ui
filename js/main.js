// --- Global State Variables ---
let availablePartitions = [''];
let currentPartition = ''; // TODO: This needs to be used by partition selector logic
let queueStateStore = null;
let viewDataFormatter = null;

// Staging/State for Modals
let currentEditQueuePath = null;

// Cache for fetched configurations
let liveRawSchedulerConf = null;    // Stores raw key-value from /ws/v1/cluster/scheduler-conf (live server state)
let isGlobalConfigEditMode = false;

// UI state
let queueElements = new Map();
let currentSearchTerm = '';
let currentSort = 'capacity';

// --- API Instance ---
// Assuming CONFIG.USE_MOCKS is defined in config.js
const api = new YarnSchedulerAPI(window.location.origin || '', true);

// --- Basic Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
    // Ensure UI component functions are available
    if (typeof showLoading !== 'function' || typeof hideLoading !== 'function' || typeof showError !== 'function') {
        console.error("Core UI functions (showLoading, hideLoading, showError) are not defined.");
        window.showLoading = (msg) => console.log("Loading:", msg);
        window.hideLoading = () => console.log("Hide loading.");
        window.showError = (msg) => console.error("Error:", msg);
    }

    showLoading('Initializing application...');
    try {
        queueStateStore = new QueueStateStore();
        viewDataFormatter = new QueueViewDataFormatter(queueStateStore);

        await api.loadSchedulerConfiguration(); // This initializes Trie in store & loads rawSchedulerInfo

        if (typeof initializeTabNavigation === 'function') initializeTabNavigation();
        else console.error("initializeTabNavigation not found.");

        if (typeof initializeEventHandlers === 'function') initializeEventHandlers();
        else console.error("initializeEventHandlers not found.");

        if (typeof switchTab === 'function') {
            const navTabs = document.querySelectorAll('.nav-tab');
            const activeHtmlTab = document.querySelector('.nav-tab.active');
            let targetTabIdToActivate = null;

            if (activeHtmlTab && activeHtmlTab.getAttribute('data-tab')) {
                targetTabIdToActivate = activeHtmlTab.getAttribute('data-tab');
            } else if (navTabs.length > 0 && navTabs[0].getAttribute('data-tab')) {
                targetTabIdToActivate = navTabs[0].getAttribute('data-tab');
                navTabs.forEach(t => t.classList.remove('active')); // Clear any stray actives
                navTabs[0].classList.add('active'); // Mark the first as active
            }

            if (targetTabIdToActivate) {
                switchTab(targetTabIdToActivate);
            } else {
                console.warn("No active tab could be determined. Attempting to default to queue-config.");
                const queueConfigPane = document.getElementById('queue-config-content');
                if (queueConfigPane) {
                    document.querySelectorAll('.tab-pane').forEach(p => {
                        p.style.display = 'none';
                        p.classList.remove('active');
                    });
                    queueConfigPane.style.display = 'block';
                    queueConfigPane.classList.add('active');
                    const qTab = document.querySelector('.nav-tab[data-tab="queue-config-content"]');
                    if(qTab) qTab.classList.add('active');

                    renderQueueTree();
                }
                hideLoading(); // Ensure loading is hidden in this fallback
            }
        } else {
            console.error("switchTab function not defined. UI might not initialize correctly.");
            hideLoading();
        }

    } catch (error) {
        showError(`Failed to initialize application: ${error.message}`);
        console.error('Application initialization failed:', error);
        hideLoading();
    }
});