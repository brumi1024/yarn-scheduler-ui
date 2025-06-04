/**
 * @file Utility functions for DOM manipulation.
 */
const DomUtils = {
    /**
     * Creates an HTML element with specified tag, class name, and attributes.
     * @param {string} tag - The HTML tag name.
     * @param {string|Array<string>} [className] - A class name or array of class names.
     * @param {Object} [attributes] - An object of attributes to set (e.g., { id: 'my-id', 'data-value': 'test' }).
     * @param {string} [textContent] - Text content for the element.
     * @returns {HTMLElement} The created HTML element.
     */
    createElement(tag, className, attributes, textContent) {
        const element = document.createElement(tag);
        if (className) {
            if (Array.isArray(className)) {
                element.classList.add(...className);
            } else {
                element.className = className;
            }
        }
        if (attributes) {
            for (const attr in attributes) {
                if (Object.hasOwnProperty.call(attributes, attr)) {
                    element.setAttribute(attr, attributes[attr]);
                }
            }
        }
        if (textContent) {
            element.textContent = textContent; // Safely sets text content, automatically escaping
        }
        return element;
    },

    /**
     * Removes all child nodes from an HTML element.
     * @param {HTMLElement} element - The HTML element to empty.
     */
    empty(element) {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    },

    /**
     * Shows an HTML element by setting its display style.
     * @param {HTMLElement} element - The HTML element to show.
     * @param {string} [displayStyle='block'] - The display style to apply (e.g., 'flex', 'inline-block').
     */
    show(element, displayStyle = 'block') {
        if (element) {
            element.style.display = displayStyle;
        }
    },

    /**
     * Hides an HTML element by setting its display style to 'none'.
     * @param {HTMLElement} element - The HTML element to hide.
     */
    hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    },

    /**
     * Gets an element by its ID.
     * @param {string} id - The ID of the element.
     * @returns {HTMLElement|null}
     */
    getById(id) {
        return document.getElementById(id);
    },

    /**
     * Queries for a single element using a CSS selector.
     * @param {string} selector - The CSS selector.
     * @param {Document|HTMLElement} [context=document] - The context to search within.
     * @returns {HTMLElement|null}
     */
    qs(selector, context = document) {
        return context.querySelector(selector);
    },

    /**
     * Queries for all elements matching a CSS selector.
     * @param {string} selector - The CSS selector.
     * @param {Document|HTMLElement} [context=document] - The context to search within.
     * @returns {NodeListOf<HTMLElement>}
     */
    qsa(selector, context = document) {
        return context.querySelectorAll(selector);
    },

    /**
     * Escapes characters for safe insertion into HTML (attribute values or text, though textContent is safer for text).
     * Specifically for use where innerHTML or setAttribute is unavoidable with dynamic unsafe strings.
     * @param {string | number | boolean | undefined | null} str - The string to escape.
     * @returns {string} The escaped string.
     */
    escapeXml(str) {
        if (str === undefined || str === null) {
            return '';
        }
        const stringValue = String(str); // Ensure it's a string
        return stringValue
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, "'");
    },
};
