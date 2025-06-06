class NotificationView {
    constructor() {
        this.container = DomUtils.getById('notification-container');
        if (!this.container) {
            this.container = DomUtils.createElement('div', 'notification-container', { id: 'notification-container' });
            document.body.append(this.container);
        }

        this.icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading:
                '<div class="loading-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:#6b7280;"></div>',
        };

        this.eventUnsubscribers = [];
    }

    /**
     * Initialize EventBus subscriptions
     * Called after all scripts are loaded
     */
    init() {
        // Use helper function to get EventBus instance
        const eventBus = getEventBus();
        
        if (!eventBus || typeof eventBus.on !== 'function') {
            console.error('EventBus is not properly initialized:', eventBus);
            return;
        }
        
        // Subscribe to EventBus notifications
        this.eventUnsubscribers.push(
            eventBus.on('notification:success', (message) => this.showSuccess(message)),
            eventBus.on('notification:error', (message) => this.showError(message)),
            eventBus.on('notification:warning', (message) => this.showWarning(message)),
            eventBus.on('notification:info', (message) => this.showInfo(message)),
            eventBus.on('notification:loading', (message) => this.show({ message, type: 'loading', duration: 0 }))
        );
    }

    showSuccess(message) {
        this.show({
            message: message,
            type: 'success'
        })
    }

    showInfo(message) {
        this.show({
            message: message,
            type: 'info'
        })
    }

    showWarning(message) {
        this.show({
            message: message,
            type: 'warning'
        })
    }

    showError(message) {
        this.show({
            message: message,
            type: 'error'
        })
    }

    /**
     * Displays a notification.
     * @param {{message: string, type?: string, duration?: number}} notificationData
     *        type: "info", "success", "error", "warning", "loading".
     *        duration: Duration in ms. Uses CONFIG defaults if not provided. 0 for indefinite.
     */
    show(notificationData) {
        const { message, type = 'info', duration } = notificationData;

        const notification = DomUtils.createElement('div', ['notification', type]);
        notification.innerHTML = `
            <span class="notification-icon">${this.icons[type] || this.icons.info}</span>
            <div class="notification-content">${message}</div>
            ${type === 'loading' ? '' : '<button class="notification-close">×</button>'}
        `;

        this.container.append(notification);

        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this._dismiss(notification));
        }

        let effectiveDuration;
        if (duration === undefined) {
            switch (type) {
                case 'success': {
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.SUCCESS;
                    break;
                }
                case 'error': {
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR;
                    break;
                }
                case 'warning': {
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.WARNING;
                    break;
                }
                default: {
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.INFO;
                    break;
                }
            }
        } else {
            effectiveDuration = duration;
        }

        if (effectiveDuration > 0 && type !== 'loading') {
            setTimeout(() => {
                this._dismiss(notification);
            }, effectiveDuration);
        }
        return notification;
    }

    _dismiss(notificationElement) {
        if (notificationElement && notificationElement.parentNode) {
            notificationElement.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.remove();
                }
            }, 300);
        }
    }
}
