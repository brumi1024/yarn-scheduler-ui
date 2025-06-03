// Cache static DOM elements
const globalSettingsContainerEl = document.getElementById('global-scheduler-settings-container');
const editGlobalConfigBtnEl = document.getElementById('edit-global-config-btn');
const saveGlobalConfigBtnEl = document.getElementById('save-global-config-btn');
const cancelGlobalConfigBtnEl = document.getElementById('cancel-global-config-btn');

/**
 * Renders the global scheduler configuration page based on the current state and metadata.
 * This includes displaying global configuration categories and their properties, enabling or disabling editing modes,
 * and handling any errors that occur during the rendering process.
 *
 * @return {Promise<void>} Resolves when the global scheduler configuration page is fully rendered.
 */
async function renderSchedulerConfigurationPage() {
    if (!globalSettingsContainerEl) return;

    if (isGlobalConfigEditMode) {
        if (editGlobalConfigBtnEl) editGlobalConfigBtnEl.style.display = 'none';
        if (saveGlobalConfigBtnEl) saveGlobalConfigBtnEl.style.display = 'inline-block';
        if (cancelGlobalConfigBtnEl) cancelGlobalConfigBtnEl.style.display = 'inline-block';
    } else {
        if (editGlobalConfigBtnEl) editGlobalConfigBtnEl.style.display = 'inline-block';
        if (saveGlobalConfigBtnEl) saveGlobalConfigBtnEl.style.display = 'none';
        if (cancelGlobalConfigBtnEl) cancelGlobalConfigBtnEl.style.display = 'none';
    }

    showLoading('Loading global scheduler settings...');
    globalSettingsContainerEl.innerHTML = '';

    try {
        let hasAnyConfigToShow = GLOBAL_CONFIG_CATEGORIES.some(cat => Object.keys(cat.properties).length > 0);
        if (!hasAnyConfigToShow) {
            globalSettingsContainerEl.innerHTML = '<p>No global scheduler settings categories are defined in the UI metadata.</p>';
            if (editGlobalConfigBtnEl) editGlobalConfigBtnEl.disabled = true;
            hideLoading();
            return;
        }
        if (editGlobalConfigBtnEl) editGlobalConfigBtnEl.disabled = false;

        let html = '';
        GLOBAL_CONFIG_CATEGORIES.forEach(group => {
            if (Object.keys(group.properties).length > 0) {
                html += `<div class="config-group">`;
                html += `<h3 class="config-group-title">${group.groupName}</h3>`;
                for (const propName in group.properties) {
                    if (Object.hasOwnProperty.call(group.properties, propName)) {
                        const metadata = group.properties[propName];
                        const liveValue = queueStateStore.getGlobalProperties().get(propName);
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
                                            <option value="true" ${String(currentValue) === "true" ? "selected" : ""}>true</option>
                                            <option value="false" ${String(currentValue) === "false" ? "selected" : ""}>false</option>
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
            globalSettingsContainerEl.innerHTML = '<p>No global scheduler settings are configured for display.</p>';
            if (editGlobalConfigBtnEl) editGlobalConfigBtnEl.disabled = true;
        } else {
            globalSettingsContainerEl.innerHTML = html;
        }
        if(typeof hideLoading === 'function') hideLoading();

    } catch (error) {
        globalSettingsContainerEl.innerHTML = `<p>Error loading global scheduler settings: ${error.message}</p>`;
        if(typeof showError === 'function') showError(`Failed to render global scheduler settings: ${error.message}`);
        if(typeof hideLoading === 'function') hideLoading();
    }
}

/**
 * Toggles the global configuration edit mode for the scheduler.
 *
 * @param {boolean} editMode - A boolean indicating whether edit mode should be enabled or disabled.
 * @return {void} Does not return a value.
 */
function toggleGlobalConfigEditMode(editMode) {
    // isGlobalConfigEditMode is a global flag
    isGlobalConfigEditMode = editMode;
    renderSchedulerConfigurationPage();
}

/**
 * Saves the global scheduler settings based on user input and propagates updates via an API call.
 * The method identifies and collects changes made to configuration items, validates them,
 * and sends them to the server for persistence. Provides feedback to the user regarding the saving process.
 *
 * @return {Promise<void>} A promise that resolves when the operation completes.
 * Returns without saving if no changes are detected. Provides user feedback on success or failure.
 */
async function saveGlobalSchedulerSettings() {
    const globalUpdatesPayload = { params: {} };
    let changesMade = 0;

    // Query for dynamic items here, as they are re-rendered
    const configItems = document.querySelectorAll('#global-scheduler-settings-container .config-item');
    configItems.forEach(item => {
        const propName = item.getAttribute('data-property-name');
        const inputElement = item.querySelector('.config-value-input');
        if (inputElement) {
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
        // api is expected to be globally available
        const response = await api.makeConfigurationUpdateApiCall({ globalUpdates: [globalUpdatesPayload] });
        if (response && response.status === 200 && typeof response.data === "string" && response.data.toLowerCase().includes("successfully applied")) {
            if(typeof showSuccess === 'function') showSuccess("Global settings saved successfully!");
            toggleGlobalConfigEditMode(false);
            // Consider re-fetching/updating queueStateStore.getGlobalProperties() if they are now stale
            // and then re-rendering if necessary, though toggleGlobalConfigEditMode(false) already does.
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

window.renderSchedulerConfigurationPage = renderSchedulerConfigurationPage;
window.toggleGlobalConfigEditMode = toggleGlobalConfigEditMode;
window.saveGlobalSchedulerSettings = saveGlobalSchedulerSettings;