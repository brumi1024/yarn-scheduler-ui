class NotificationView {
    constructor() {
        this.container = DomUtils.getById('notification-container');
        if (!this.container) {
            this.container = DomUtils.createElement('div', 'notification-container', { id: 'notification-container' });
            document.body.appendChild(this.container);
        }

        this.icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading:
                '<div class="loading-spinner" style="width:18px;height:18px;border-width:2px;border-top-color:#6b7280;"></div>',
        };
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
            ${type !== 'loading' ? '<button class="notification-close">×</button>' : ''}
        `;

        this.container.appendChild(notification);

        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.onclick = () => this._dismiss(notification);
        }

        let effectiveDuration;
        if (duration === undefined) {
            switch (type) {
                case 'success':
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.SUCCESS;
                    break;
                case 'error':
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR;
                    break;
                case 'warning':
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.WARNING;
                    break;
                case 'info':
                default:
                    effectiveDuration = CONFIG.TIMEOUTS.NOTIFICATION_DURATION.INFO;
                    break;
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
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            }, 300);
        }
    }
}
