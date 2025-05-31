// getEditableGlobalProperties (if still needed separately, or logic incorporated into render)
function getEditableGlobalProperties(properties) {
    if (!properties) return [];
    return properties.filter(prop => {
        const name = prop.name;
        if (name.includes('mutation-api.version') || 
            (name.startsWith('yarn.scheduler.capacity.root.') && name.split('.').length > 4) || 
            (name.startsWith('yarn.scheduler.capacity.root.') && name.split('.').length <=4 && !GLOBAL_CONFIG_CATEGORIES.flatMap(g=>Object.keys(g.properties)).includes(name))
           ) {
            return false; 
        }
        if (GLOBAL_CONFIG_CATEGORIES.flatMap(g=>Object.keys(g.properties)).includes(name)) {
            return true;
        }
        return !name.includes(".root.") && name.startsWith('yarn.scheduler.capacity.');
    });
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
    
    if(typeof showLoading === 'function') showLoading('Loading global scheduler settings...');
    container.innerHTML = ''; 

    try {
        if (globalSchedulerSettings === null) { // Check specifically for null
            const rawConf = await api.getSchedulerConf();
            if (rawConf && rawConf.property) {
                globalSchedulerSettings = new Map(rawConf.property.map(p => [p.name, p.value]));
            } else {
                globalSchedulerSettings = new Map();
                if(typeof showWarning === 'function') showWarning("Could not fetch live global settings, or none are set. Displaying defaults.");
            }
        }

        let hasAnyConfigToShow = GLOBAL_CONFIG_CATEGORIES.some(cat => Object.keys(cat.properties).length > 0);
        if (!hasAnyConfigToShow) {
            container.innerHTML = '<p>No global scheduler settings categories are defined in the UI metadata.</p>';
            if (editBtn) editBtn.disabled = true;
            if(typeof hideLoading === 'function') hideLoading();
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
                                html += `<input type="number" id="${inputId}" class="config-value-input" value="${currentValue}" data-original-value="${originalValueForEdit}" ${metadata.type === "percentage" ? `step="${metadata.step || '0.01'}" min="0" max="1"` : (metadata.step ? `step="${metadata.step}"` : '')}>`;
                            } else { 
                                html += `<input type="text" id="${inputId}" class="config-value-input" value="${currentValue}" data-original-value="${originalValueForEdit}">`;
                            }
                        } else {
                            html += `<span class="config-value-display">${currentValue}</span>`;
                        }
                        html += `       </div></div>`; 
                    }
                }
                html += `</div>`;
            }
        });
        
        if (html === '') {
            container.innerHTML = '<p>No global scheduler settings are configured for display.</p>';
            if (editBtn) editBtn.disabled = true;
        } else {
            container.innerHTML = html;
        }
        if(typeof hideLoading === 'function') hideLoading();

    } catch (error) {
        container.innerHTML = `<p>Error loading global scheduler settings: ${error.message}</p>`;
        if(typeof showError === 'function') showError(`Failed to render global scheduler settings: ${error.message}`);
        if(typeof hideLoading === 'function') hideLoading();
    }
}

function toggleGlobalConfigEditMode(editMode) {
    isGlobalConfigEditMode = editMode;
    renderSchedulerConfigurationPage(); // Re-render to show/hide inputs and update button states
}

async function saveGlobalSchedulerSettings() {
    const globalUpdatesPayload = { params: {} };
    let changesMade = 0;

    if (globalSchedulerSettings === null) { // Ensure settings are loaded if trying to save without viewing first
        try {
            const rawConf = await api.getSchedulerConf();
            globalSchedulerSettings = rawConf && rawConf.property ? new Map(rawConf.property.map(p => [p.name, p.value])) : new Map();
        } catch (e) {
            globalSchedulerSettings = new Map();
            if(typeof showError === 'function') showError("Could not confirm current settings before saving. Please try again.");
            return;
        }
    }

    const configItems = document.querySelectorAll('#global-scheduler-settings-container .config-item');
    configItems.forEach(item => {
        const propName = item.getAttribute('data-property-name');
        const inputElement = item.querySelector('.config-value-input'); 
        if (inputElement) { // Only process if in edit mode (inputs are present)
            const newValue = inputElement.value;
            const originalValueDisplayed = inputElement.getAttribute('data-original-value'); 
            if (newValue !== originalValueDisplayed) {
                globalUpdatesPayload.params[propName] = newValue;
                changesMade++;
            }
        }
    });

    if (changesMade === 0) {
        if(typeof showInfo === 'function') showInfo("No changes to save.");
        toggleGlobalConfigEditMode(false); 
        return;
    }

    if(typeof showLoading === 'function') showLoading("Saving global settings...");
    try {
        const response = await api.makeConfigurationUpdateApiCall({ globalUpdates: [globalUpdatesPayload] });
        if (response && response.status === 200 && typeof response.data === "string" && response.data.toLowerCase().includes("successfully applied")) {
            if(typeof showSuccess === 'function') showSuccess("Global settings saved successfully!");
            globalSchedulerSettings = null; 
            toggleGlobalConfigEditMode(false); 
        } else {
            const errorMessage = response && response.data ? (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)) : "Unknown error";
            if(typeof showError === 'function') showError(`Failed to save global settings: ${errorMessage}`);
        }
    } catch (error) {
        if(typeof showError === 'function') showError(`Error saving global settings: ${error.message}`);
    } finally {
        if(typeof hideLoading === 'function') hideLoading();
    }
}

// Expose functions to global scope as they are called from HTML onclicks or by other modules
window.renderSchedulerConfigurationPage = renderSchedulerConfigurationPage;
window.toggleGlobalConfigEditMode = toggleGlobalConfigEditMode;
window.saveGlobalSchedulerSettings = saveGlobalSchedulerSettings;