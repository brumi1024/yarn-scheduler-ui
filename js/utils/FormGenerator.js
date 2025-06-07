/**
 * Simplified form generation utility for modal views.
 * Reduces boilerplate and provides consistent form structure.
 */
const FormGenerator = {
    /**
     * Generates form HTML from field configuration.
     * @param {Array} fields - Array of field configuration objects
     * @param {Object} options - Additional form options
     * @returns {string} Generated HTML string
     */
    generateForm(fields, options = {}) {
        const formId = options.formId || 'generated-form';
        const submitOnEnter = options.submitOnEnter !== false;

        let html = `<form id="${formId}"${submitOnEnter ? '' : ' onsubmit="return false;"'}>`;

        for (const field of fields) {
            html += this._generateField(field);
        }

        html += '</form>';

        if (options.actions) {
            html += this._generateActions(options.actions);
        }

        return html;
    },

    /**
     * Generates a single form field.
     * @param {Object} field - Field configuration
     * @returns {string} Field HTML
     */
    _generateField(field) {
        const {
            type = 'text',
            id,
            name,
            label,
            value = '',
            placeholder = '',
            required = false,
            readonly = false,
            options = [],
            help = '',
            validation = true,
            attributes = {},
            cssClass = 'form-group',
        } = field;

        let html = `<div class="${cssClass}">`;

        // Label
        if (label) {
            const labelText = required ? `${label} *` : label;
            html += `<label class="form-label" for="${id}">${DomUtils.escapeXml(labelText)}</label>`;
        }

        // Input field
        html += this._generateInput(type, {
            id,
            name: name || id,
            value,
            placeholder,
            required,
            readonly,
            options,
            attributes,
        });

        // Help text
        if (help) {
            html += `<small class="form-help">${DomUtils.escapeXml(help)}</small>`;
        }

        // Validation message container
        if (validation) {
            html += `<div class="validation-message" id="${id}-validation"></div>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Generates input element based on type.
     * @param {string} type - Input type
     * @param {Object} config - Input configuration
     * @returns {string} Input HTML
     */
    _generateInput(type, config) {
        const { id, name, value, placeholder, required, readonly, options, attributes } = config;

        let attrs = `id="${id}" name="${name}"`;
        if (required) attrs += ' required';
        if (readonly) attrs += ' readonly';

        // Add custom attributes
        for (const [key, val] of Object.entries(attributes)) {
            attrs += ` ${key}="${DomUtils.escapeXml(val)}"`;
        }

        switch (type) {
            case 'select': {
                let selectHtml = `<select class="form-input" ${attrs}>`;
                for (const option of options) {
                    const optValue = option.value || option;
                    const optLabel = option.label || option;
                    const selected = optValue === value ? ' selected' : '';
                    selectHtml += `<option value="${DomUtils.escapeXml(optValue)}"${selected}>${DomUtils.escapeXml(optLabel)}</option>`;
                }
                selectHtml += '</select>';
                return selectHtml;
            }

            case 'textarea': {
                return `<textarea class="form-input" ${attrs} placeholder="${DomUtils.escapeXml(placeholder)}">${DomUtils.escapeXml(value)}</textarea>`;
            }

            case 'checkbox': {
                const checked = value ? ' checked' : '';
                return `<input type="checkbox" class="form-input" ${attrs}${checked}>`;
            }

            case 'radio': {
                let radioHtml = '';
                for (const option of options) {
                    const optValue = option.value || option;
                    const optLabel = option.label || option;
                    const checked = optValue === value ? ' checked' : '';
                    radioHtml += `<label class="radio-label">
                        <input type="radio" name="${name}" value="${DomUtils.escapeXml(optValue)}"${checked}> ${DomUtils.escapeXml(optLabel)}
                    </label>`;
                }
                return radioHtml;
            }

            default: {
                return `<input type="${type}" class="form-input" ${attrs} value="${DomUtils.escapeXml(value)}" placeholder="${DomUtils.escapeXml(placeholder)}">`;
            }
        }
    },

    /**
     * Generates action buttons.
     * @param {Array} actions - Array of action button configurations
     * @returns {string} Actions HTML
     */
    _generateActions(actions) {
        let html = '<div class="modal-actions">';

        for (const action of actions) {
            const { id, text, type = 'button', cssClass = 'btn btn-secondary', attributes = {} } = action;

            let attrs = `id="${id}" type="${type}"`;
            for (const [key, val] of Object.entries(attributes)) {
                attrs += ` ${key}="${DomUtils.escapeXml(val)}"`;
            }

            html += `<button class="${cssClass}" ${attrs}>${DomUtils.escapeXml(text)}</button>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Creates a field configuration for queue properties.
     * @param {string} simpleKey - Simple property key
     * @param {Object} meta - Property metadata
     * @param {string} currentValue - Current property value
     * @param {string} fullYarnKey - Full YARN property key
     * @returns {Object} Field configuration
     */
    createQueuePropertyField(simpleKey, meta, currentValue, fullYarnKey) {
        const field = {
            id: `edit-queue-${simpleKey.replaceAll(/[^\w-]/g, '-')}`,
            name: simpleKey,
            label: meta.displayName,
            value: currentValue,
            help: meta.description || '',
            required: meta.required || false,
            attributes: {
                'data-simple-key': simpleKey,
                'data-full-key': fullYarnKey,
                'data-original-value': currentValue,
            },
        };

        // Set input type based on metadata
        switch (meta.type) {
        case 'enum': {
            field.type = 'select';
            field.options = meta.options || [];
        
        break;
        }
        case 'boolean': {
            field.type = 'select';
            field.options = [
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
            ];
        
        break;
        }
        case 'number': 
        case 'percentage': {
            field.type = 'number';
            if (meta.min !== undefined) field.attributes.min = meta.min;
            if (meta.max !== undefined) field.attributes.max = meta.max;
            if (meta.step !== undefined) field.attributes.step = meta.step;
        
        break;
        }
        default: {
            field.type = 'text';
        }
        }

        // Special handling for capacity fields
        if (
            simpleKey === 'capacity' ||
            simpleKey === 'maximum-capacity' ||
            simpleKey.endsWith('.capacity') ||
            simpleKey.endsWith('.maximum-capacity')
        ) {
            field.type = 'text'; // Always text for capacity values
        }

        return field;
    },

    /**
     * Creates standard form actions for modals.
     * @param {Object} options - Action options
     * @returns {Array} Array of action configurations
     */
    createStandardActions(options = {}) {
        const {
            cancelText = 'Cancel',
            cancelId = 'cancel-btn',
            submitText = 'Submit',
            submitId = 'submit-btn',
            submitClass = 'btn btn-primary',
        } = options;

        return [
            {
                id: cancelId,
                text: cancelText,
                cssClass: 'btn btn-secondary',
            },
            {
                id: submitId,
                text: submitText,
                cssClass: submitClass,
            },
        ];
    },

    /**
     * Extracts form data from generated form.
     * @param {HTMLFormElement} form - Form element
     * @param {Object} options - Extraction options
     * @returns {Object} Form data
     */
    extractFormData(form, options = {}) {
        const { includeOriginal = false, validateChanges = true } = options;
        const data = {};
        const changes = {};

        for (const input of form.querySelectorAll('.form-input')) {
            const name = input.name || input.dataset.simpleKey;
            if (!name) continue;

            let value = input.value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = value === '' ? '' : Number(value);
            }

            data[name] = value;

            if (validateChanges && includeOriginal) {
                const originalValue = input.dataset.originalValue;
                if (originalValue !== undefined && String(value) !== String(originalValue)) {
                    changes[name] = value;
                }
            }
        }

        return includeOriginal ? { data, changes } : data;
    },
};
