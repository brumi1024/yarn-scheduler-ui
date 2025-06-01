function openInfoModal(queue) {
    if (!queue) {
        if (typeof showError === "function") showError("Cannot show info: Queue data missing.");
        return;
    }
    const infoFormContainer = document.getElementById("info-form-container");
    // createInfoFormHTML should take the queue object and display its properties.
    infoFormContainer.innerHTML = createInfoFormHTML(queue); 
    document.getElementById("info-modal").classList.add("show");
}

function createInfoFormHTML(queue) {
    let html = `<div class="queue-info-container">`;
    const pendingChange = pendingChanges.get(queue.path) || {};
    const currentLiveConf = liveRawSchedulerConf || new Map(); // Use liveRawSchedulerConf
    
    // Basic Info Section (Hardcoded for now, can be derived from a "basic info" category in metadata)
    html += `<div class="info-section">
               <h3 class="info-section-title">📋 Basic Information</h3>
               <table class="info-table">`;
    html += `<tr><td class="info-label">Name</td><td class="info-value">${queue.name}</td></tr>`;
    html += `<tr><td class="info-label">Path</td><td class="info-value">${queue.path}</td></tr>`;
    
    const stateYarnProp = `yarn.scheduler.capacity.${queue.path}.state`;
    const effectiveState = pendingChange[stateYarnProp] !== undefined ? pendingChange[stateYarnProp] : 
                           (currentLiveConf.get(stateYarnProp) !== undefined ? currentLiveConf.get(stateYarnProp) : queue.state);
    html += `<tr><td class="info-label">State</td><td class="info-value">${effectiveState || 'N/A'}</td></tr>`;
    html += `<tr><td class="info-label">Type</td><td class="info-value">${queue.queueType || (queue.children && Object.keys(queue.children).length > 0 ? 'parent' : 'leaf')}</td></tr>`;
    html += `</table></div>`;

    // Capacity Info Section (using metadata where possible)
    html += `<div class="info-section">
               <h3 class="info-section-title">📊 Capacity Details</h3>
               <table class="info-table">`;
    let capMode = pendingChange._ui_capacityMode || queue.capacityMode || (typeof detectCapacityMode === 'function' ? detectCapacityMode(queue) : 'percentage');
    html += `<tr><td class="info-label">Capacity Mode</td><td class="info-value">${capMode}</td></tr>`;

    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        for (const placeholderPropName in category.properties) {
            const propDef = category.properties[placeholderPropName];
            // Only show a subset for info modal or all if desired
            if (placeholderPropName.includes('.capacity') || placeholderPropName.includes('.maximum-capacity') || placeholderPropName.includes('user-limit-factor')) {
                 const actualPropName = placeholderPropName.replace(Q_PATH_PLACEHOLDER, queue.path);
                 let displayVal = pendingChange[actualPropName];
                 if (displayVal === undefined) displayVal = currentLiveConf.get(actualPropName);
                 
                 // Fallback for core capacity fields if not in scheduler-conf but on queue object
                 if (displayVal === undefined) {
                    if (actualPropName.endsWith('.capacity')) displayVal = queue.capacity;
                    else if (actualPropName.endsWith('.maximum-capacity')) displayVal = queue.maxCapacity;
                    else if (actualPropName.endsWith('.user-limit-factor')) displayVal = queue.userLimitFactor;
                 }
                 if (displayVal === undefined) displayVal = propDef.defaultValue; // Final fallback

                 // Formatting for display
                 if (actualPropName.endsWith('.capacity') && capMode === 'percentage' && !String(displayVal).includes('%')) displayVal = `${parseFloat(displayVal || 0).toFixed(1)}%`;
                 else if (actualPropName.endsWith('.capacity') && capMode === 'weight' && !String(displayVal).endsWith('w')) displayVal = `${parseFloat(displayVal || 0).toFixed(1)}w`;
                 else if (actualPropName.endsWith('.maximum-capacity') && !String(displayVal).startsWith('[') && !String(displayVal).endsWith('%')) displayVal = `${parseFloat(displayVal || 0).toFixed(1)}%`;


                html += `<tr><td class="info-label">${propDef.displayName}</td><td class="info-value">${displayVal !== undefined ? displayVal : 'N/A'}</td></tr>`;
            }
        }
    });
    html += `<tr><td class="info-label">Absolute Used Capacity</td><td class="info-value">${queue.absoluteUsedCapacity !== undefined ? queue.absoluteUsedCapacity.toFixed(1) + '%' : 'N/A'}</td></tr>`;
    html += `<tr><td class="info-label">Number of Applications</td><td class="info-value">${queue.numApplications || 0}</td></tr>`;
    html += `</table></div>`;
    
    // Could add more sections by iterating other QUEUE_CONFIG_CATEGORIES items
    html += `</div>`;
    return html;
}


window.openInfoModal = openInfoModal;
// closeInfoModal is in modal-helpers.js