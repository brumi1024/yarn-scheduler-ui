/**
 * Service for handling auto queue creation configuration and validation.
 * Supports both v1 (legacy) and v2 (flexible) auto-creation modes.
 */
const AutoCreationService = {
    /**
     * Gets the v1 auto-creation property key for a queue using metadata
     * @param {string} queuePath - Queue path
     * @returns {string} Full property key
     */
    getV1EnabledKey(queuePath) {
        for (const [placeholderKey, meta] of Object.entries(AUTO_CREATION_CONFIG_METADATA)) {
            if (meta.semanticRole === 'v1-enabled-key') {
                return placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
            }
        }
        throw new Error('v1-enabled-key not found in AUTO_CREATION_CONFIG_METADATA');
    },

    /**
     * Gets the v2 auto-creation property key for a queue using metadata
     * @param {string} queuePath - Queue path
     * @returns {string} Full property key
     */
    getV2EnabledKey(queuePath) {
        for (const [placeholderKey, meta] of Object.entries(AUTO_CREATION_CONFIG_METADATA)) {
            if (meta.semanticRole === 'v2-enabled-key') {
                return placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
            }
        }
        throw new Error('v2-enabled-key not found in AUTO_CREATION_CONFIG_METADATA');
    },
    /**
     * Populates auto-creation data for modal display
     * @param {Object} dataForModal - Modal data object to populate
     * @param {string} queuePath - Queue path
     * @param {Map} baseProperties - Queue properties map
     */
    populateAutoCreationData(dataForModal, queuePath, baseProperties) {
        // Check if auto-creation is enabled (check both v1 and v2) using metadata-driven keys
        const v1AutoCreateKey = AutoCreationService.getV1EnabledKey(queuePath);
        const v2AutoCreateKey = AutoCreationService.getV2EnabledKey(queuePath);
        const v1AutoCreateValue = baseProperties.get(v1AutoCreateKey);
        const v2AutoCreateValue = baseProperties.get(v2AutoCreateKey);

        dataForModal.autoCreationData.enabled =
            String(v1AutoCreateValue).toLowerCase() === 'true' || String(v2AutoCreateValue).toLowerCase() === 'true';

        dataForModal.autoCreationData.v1Enabled = String(v1AutoCreateValue).toLowerCase() === 'true';
        dataForModal.autoCreationData.v2Enabled = String(v2AutoCreateValue).toLowerCase() === 'true';

        // Non-template properties
        dataForModal.autoCreationData.nonTemplateProperties = {};
        for (const [placeholderKey, meta] of Object.entries(AUTO_CREATION_CONFIG_METADATA)) {
            const fullKey = placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
            const value = baseProperties.get(fullKey);
            const isDefault = value === undefined;

            dataForModal.autoCreationData.nonTemplateProperties[meta.key] = {
                value: isDefault ? '' : String(value),
                isDefault: isDefault,
                meta: meta,
            };
        }

        // Template properties
        dataForModal.autoCreationData.templateProperties = {};
        dataForModal.autoCreationData.v1TemplateProperties = {};
        dataForModal.autoCreationData.v2TemplateProperties = {
            template: {},
            parentTemplate: {},
            leafTemplate: {},
        };
        for (const category of QUEUE_CONFIG_METADATA) {
            for (const [_placeholderKey, meta] of Object.entries(category.properties)) {
                if (meta.availableInTemplate) {
                    const v1FullKey = `yarn.scheduler.capacity.${queuePath}.leaf-queue-template.${meta.key}`;
                    const v1Value = baseProperties.get(v1FullKey);
                    const v1IsDefault = v1Value === undefined;

                    dataForModal.autoCreationData.v1TemplateProperties[meta.key] = {
                        value: v1IsDefault ? '' : String(v1Value),
                        isDefault: v1IsDefault,
                        meta: meta,
                    };

                    const v2Scopes = ['template', 'parent-template', 'leaf-template'];
                    for (const scope of v2Scopes) {
                        const v2FullKey = `yarn.scheduler.capacity.${queuePath}.auto-queue-creation-v2.${scope}.${meta.key}`;
                        const v2Value = baseProperties.get(v2FullKey);
                        const v2IsDefault = v2Value === undefined;

                        const scopeKey = scope.includes('-')
                            ? scope.replaceAll(/-([a-z])/g, (match, letter) => letter.toUpperCase())
                            : scope;

                        if (!dataForModal.autoCreationData.v2TemplateProperties[scopeKey]) {
                            dataForModal.autoCreationData.v2TemplateProperties[scopeKey] = {};
                        }

                        dataForModal.autoCreationData.v2TemplateProperties[scopeKey][meta.key] = {
                            value: v2IsDefault ? '' : String(v2Value),
                            isDefault: v2IsDefault,
                            meta: meta,
                        };
                    }
                }
            }
        }
    },

    /**
     * Checks if auto-creation is enabled for a queue
     * @param {string} queuePath - Queue path
     * @param {Map} properties - Queue properties
     * @returns {Object} Object with enabled, v1Enabled, v2Enabled flags
     */
    getAutoCreationStatus(queuePath, properties) {
        const v1AutoCreateKey = AutoCreationService.getV1EnabledKey(queuePath);
        const v2AutoCreateKey = AutoCreationService.getV2EnabledKey(queuePath);
        const v1AutoCreateValue = properties.get(v1AutoCreateKey);
        const v2AutoCreateValue = properties.get(v2AutoCreateKey);

        const v1Enabled = String(v1AutoCreateValue).toLowerCase() === 'true';
        const v2Enabled = String(v2AutoCreateValue).toLowerCase() === 'true';

        return {
            enabled: v1Enabled || v2Enabled,
            v1Enabled: v1Enabled,
            v2Enabled: v2Enabled,
        };
    },

    /**
     * Generates UI labels for auto-creation status
     * @param {string} queuePath - Queue path
     * @param {Map} effectiveProperties - Queue properties
     * @returns {Array} Array of label objects for UI display
     */
    generateAutoCreationLabels(queuePath, effectiveProperties) {
        const labels = [];
        const v1AutoCreateKey = AutoCreationService.getV1EnabledKey(queuePath);
        const v2AutoCreateKey = AutoCreationService.getV2EnabledKey(queuePath);
        const v1AutoCreateEnabled = String(effectiveProperties.get(v1AutoCreateKey) || '').toLowerCase() === 'true';
        const v2AutoCreateEnabled = String(effectiveProperties.get(v2AutoCreateKey) || '').toLowerCase() === 'true';

        if (v1AutoCreateEnabled) {
            labels.push({
                text: '⚡ Auto-Create v1',
                cssClass: 'queue-tag tag-auto-create-v1',
                tooltip:
                    'Legacy Auto Queue Creation (v1). Automatically creates child leaf queues based on user or group mappings using traditional template properties. These queues inherit properties from the parent leaf-queue-template configuration and can be automatically deleted after inactivity.',
            });
        }

        if (v2AutoCreateEnabled) {
            labels.push({
                text: '🚀 Auto-Create v2',
                cssClass: 'queue-tag tag-auto-create-v2',
                tooltip:
                    'Flexible Auto Queue Creation (v2). Advanced auto-creation mode with support for different template scopes (general, parent, leaf), management policies, and enhanced flexibility. Available in weight-based capacity modes and non-legacy queue configurations.',
            });
        }

        return labels;
    },
};
