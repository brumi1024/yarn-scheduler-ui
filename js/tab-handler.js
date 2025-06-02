/**
 * Switches the active tab and content pane.
 * @param {string} targetTabId - The ID of the content pane to make active.
 */
function switchTab(targetTabId) {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const queueControls = document.getElementById('queue-config-controls');
    // Batch controls visibility is handled by updateBatchControls itself based on active tab
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

    // Fallback if targetTabId is somehow not found (e.g., on initial load if no tab is pre-marked active)
    if (!activeTabFound && navTabs.length > 0) {
        navTabs[0].classList.add('active');
        targetTabId = navTabs[0].getAttribute('data-tab') || 'queue-config-content'; // Default to queue config
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

    // Show/hide context-specific controls
    if (queueControls) {
        queueControls.style.display = (targetTabId === 'queue-config-content' ? 'flex' : 'none');
    }
    updateBatchControls();

    if (globalConfigActions) { // Assuming globalConfigActions is specific to the global config tab's header
        globalConfigActions.style.visibility = (targetTabId === 'scheduler-config-content' ? 'visible' : 'hidden');
    }

    // Call render functions for specific tabs when they are switched to
    if (targetTabId === 'queue-config-content') {
        if (typeof renderQueueTree === 'function' && queueStateStore.getQueueHierarchy()) renderQueueTree(); // renderQueueTree from queue-renderer.js
        if (typeof showContent === 'function') showContent(true); // Assuming showContent manages general content visibility
        if (typeof hideLoading === 'function') hideLoading(); // Ensure loading is hidden
    } else if (targetTabId === 'scheduler-config-content') {
        isGlobalConfigEditMode = false; // Reset edit mode when switching to this tab
        if (typeof renderSchedulerConfigurationPage === 'function') renderSchedulerConfigurationPage(); // From global-config-ui.js
        if (typeof hideLoading === 'function') hideLoading();
    } else if (targetTabId === 'placement-rules-content') {
        console.log("Placement Rules tab selected (Not yet implemented).");
        if (typeof hideLoading === 'function') hideLoading();
    } else if (targetTabId === 'node-labels-content') {
        console.log("Node Labels tab selected (Not yet implemented).");
        if (typeof hideLoading === 'function') hideLoading();
    }
}

/**
 * Initializes event listeners for tab navigation.
 */
function initializeTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTabId = this.getAttribute('data-tab');
            if (targetTabId) { // Ensure targetTabId is not null
                switchTab(targetTabId);
            } else {
                console.warn("Tab clicked has no data-tab attribute:", this);
            }
        });
    });
}

// Expose to global scope for main.js and potentially direct calls
window.switchTab = switchTab;
window.initializeTabNavigation = initializeTabNavigation;