/**
 * Switches to the specified target tab by updating the active tab and pane.
 * Handles the visibility of context-specific controls and invokes specialized render functions for certain tabs.
 *
 * @param {string} targetTabId - The identifier of the tab to activate.
 * @return {void} This function does not return a value.
 */
function switchTab(targetTabId) {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const queueControls = document.getElementById('queue-config-controls');
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
        if (queueStateStore.getQueueHierarchy()) renderQueueTree();
        showContent(true);
        hideLoading();
    } else if (targetTabId === 'scheduler-config-content') {
        isGlobalConfigEditMode = false;
        renderSchedulerConfigurationPage();
        hideLoading();
    } else if (targetTabId === 'placement-rules-content') {
        hideLoading();
    } else if (targetTabId === 'node-labels-content') {
        hideLoading();
    }
}

/**
 * Initializes the tab navigation by adding click event listeners to elements
 * with the class 'nav-tab'. When a tab is clicked, it retrieves the associated
 * data-tab attribute and switches to the corresponding tab using the `switchTab` function.
 *
 * @return {void} This function does not return any value.
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