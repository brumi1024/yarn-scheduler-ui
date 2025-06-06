/**
 * TooltipHelper - Unified tooltip behavior across the application
 * 
 * Provides consistent tooltip behavior with smart positioning to avoid
 * viewport edges and control bar collisions. Replaces the inconsistent
 * implementations between queue cards and form modals.
 */
class TooltipHelper {
    /**
     * Creates and attaches a tooltip to the given element.
     * @param {HTMLElement} element - The element to attach tooltip to
     * @param {string} content - The tooltip text content
     * @param {Object} options - Configuration options
     * @param {number} options.delay - Show delay in milliseconds (default: 500)
     * @param {string} options.position - Preferred position: 'top'|'bottom'|'left'|'right' (default: 'top')
     * @param {number} options.maxWidth - Maximum tooltip width in pixels (default: 220)
     * @param {boolean} options.allowHtml - Allow HTML content (default: false)
     */
    static attachTooltip(element, content, options = {}) {
        if (!element || !content) return;

        const config = {
            delay: options.delay || 500,
            position: options.position || 'top',
            maxWidth: options.maxWidth || 220,
            allowHtml: options.allowHtml || false,
            ...options
        };

        // Remove any existing tooltip
        TooltipHelper.removeTooltip(element);

        // Store tooltip data on the element
        element._tooltipData = {
            content,
            config,
            timeoutId: null,
            isVisible: false
        };

        // Add event listeners
        element.addEventListener('mouseenter', TooltipHelper._handleMouseEnter);
        element.addEventListener('mouseleave', TooltipHelper._handleMouseLeave);
        element.addEventListener('focus', TooltipHelper._handleFocus);
        element.addEventListener('blur', TooltipHelper._handleBlur);

        // Mark element as having tooltip
        element.classList.add('has-tooltip');
    }

    /**
     * Removes tooltip from the given element.
     * @param {HTMLElement} element - The element to remove tooltip from
     */
    static removeTooltip(element) {
        if (!element || !element._tooltipData) return;

        // Clear any pending timeout
        if (element._tooltipData.timeoutId) {
            clearTimeout(element._tooltipData.timeoutId);
        }

        // Hide tooltip if visible
        TooltipHelper._hideTooltip(element);

        // Remove event listeners
        element.removeEventListener('mouseenter', TooltipHelper._handleMouseEnter);
        element.removeEventListener('mouseleave', TooltipHelper._handleMouseLeave);
        element.removeEventListener('focus', TooltipHelper._handleFocus);
        element.removeEventListener('blur', TooltipHelper._handleBlur);

        // Clean up data
        delete element._tooltipData;
        element.classList.remove('has-tooltip');
    }


    /**
     * Upgrades modal info icons to use unified tooltip system.
     * @param {HTMLElement} modalElement - The modal container element
     */
    static upgradeModalTooltips(modalElement) {
        const infoIcons = modalElement.querySelectorAll('.info-icon[title]');
        
        for (const icon of infoIcons) {
            const content = icon.getAttribute('title');
            if (content) {
                // Remove the title attribute to prevent browser tooltip
                icon.removeAttribute('title');
                
                // Apply unified tooltip
                TooltipHelper.attachTooltip(icon, content, {
                    position: 'top',
                    delay: 500,
                    maxWidth: 280 // Slightly wider for longer descriptions
                });
            }
        }
    }

    // Private event handlers
    static _handleMouseEnter(event) {
        const element = event.currentTarget;
        const data = element._tooltipData;
        if (!data) return;

        // Clear any existing timeout
        if (data.timeoutId) {
            clearTimeout(data.timeoutId);
        }

        // Set timeout to show tooltip
        data.timeoutId = setTimeout(() => {
            TooltipHelper._showTooltip(element);
        }, data.config.delay);
    }

    static _handleMouseLeave(event) {
        const element = event.currentTarget;
        TooltipHelper._hideTooltip(element);
    }

    static _handleFocus(event) {
        const element = event.currentTarget;
        // Show immediately on focus for accessibility
        TooltipHelper._showTooltip(element);
    }

    static _handleBlur(event) {
        const element = event.currentTarget;
        TooltipHelper._hideTooltip(element);
    }

    /**
     * Shows the tooltip for the given element with smart positioning.
     * @param {HTMLElement} element - The element to show tooltip for
     * @private
     */
    static _showTooltip(element) {
        const data = element._tooltipData;
        if (!data || data.isVisible) return;

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'unified-tooltip';
        tooltip.style.maxWidth = `${data.config.maxWidth}px`;
        
        if (data.config.allowHtml) {
            tooltip.innerHTML = data.content;
        } else {
            tooltip.textContent = data.content;
        }

        // Add to DOM temporarily to measure
        document.body.appendChild(tooltip);
        
        // Calculate smart position
        const position = TooltipHelper._calculatePosition(element, tooltip, data.config.position);
        
        // Apply position
        tooltip.style.left = `${position.left}px`;
        tooltip.style.top = `${position.top}px`;
        tooltip.classList.add(`tooltip-${position.placement}`);

        // Show with animation
        tooltip.classList.add('tooltip-visible');
        
        // Store reference and mark as visible
        element._tooltipElement = tooltip;
        data.isVisible = true;
    }

    /**
     * Hides the tooltip for the given element.
     * @param {HTMLElement} element - The element to hide tooltip for
     * @private
     */
    static _hideTooltip(element) {
        const data = element._tooltipData;
        if (!data) return;

        // Clear any pending timeout
        if (data.timeoutId) {
            clearTimeout(data.timeoutId);
            data.timeoutId = null;
        }

        // Remove tooltip element if it exists
        if (element._tooltipElement) {
            element._tooltipElement.remove();
            delete element._tooltipElement;
        }

        data.isVisible = false;
    }

    /**
     * Calculates the optimal position for a tooltip with smart positioning.
     * @param {HTMLElement} element - The trigger element
     * @param {HTMLElement} tooltip - The tooltip element
     * @param {string} preferredPosition - The preferred position
     * @returns {Object} Position object with left, top, and placement
     * @private
     */
    static _calculatePosition(element, tooltip, preferredPosition) {
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get control bar height to avoid collision
        const controlBar = document.querySelector('.controls');
        const controlBarHeight = controlBar ? controlBar.getBoundingClientRect().bottom : 0;
        
        const spacing = 8; // Space between element and tooltip
        
        let position = { left: 0, top: 0, placement: preferredPosition };

        // Calculate positions for each placement option
        const positions = {
            top: {
                left: elementRect.left + (elementRect.width - tooltipRect.width) / 2,
                top: elementRect.top - tooltipRect.height - spacing,
                placement: 'top'
            },
            bottom: {
                left: elementRect.left + (elementRect.width - tooltipRect.width) / 2,
                top: elementRect.bottom + spacing,
                placement: 'bottom'
            },
            left: {
                left: elementRect.left - tooltipRect.width - spacing,
                top: elementRect.top + (elementRect.height - tooltipRect.height) / 2,
                placement: 'left'
            },
            right: {
                left: elementRect.right + spacing,
                top: elementRect.top + (elementRect.height - tooltipRect.height) / 2,
                placement: 'right'
            }
        };

        // Start with preferred position
        position = positions[preferredPosition];

        // Check if preferred position would collide with control bar
        if (position.top < controlBarHeight) {
            // Try bottom placement first
            if (positions.bottom.top + tooltipRect.height <= viewportHeight - spacing) {
                position = positions.bottom;
            } else {
                // Try right if there's space
                if (positions.right.left + tooltipRect.width <= viewportWidth - spacing) {
                    position = positions.right;
                } else if (positions.left.left >= spacing) {
                    // Try left as last resort
                    position = positions.left;
                } else {
                    // Force bottom placement even if it goes off-screen
                    position = positions.bottom;
                }
            }
        }

        // Check horizontal boundaries and adjust
        if (position.left < spacing) {
            position.left = spacing;
        } else if (position.left + tooltipRect.width > viewportWidth - spacing) {
            position.left = viewportWidth - tooltipRect.width - spacing;
        }

        // Check vertical boundaries for top/bottom placements
        if ((position.placement === 'top' || position.placement === 'bottom') && 
            position.top < controlBarHeight) {
            position.top = controlBarHeight + spacing;
        }

        return position;
    }

}

// Export for use in other modules
window.TooltipHelper = TooltipHelper;