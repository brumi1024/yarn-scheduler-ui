import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    Snackbar,
    Alert,
    AlertColor,
} from '@mui/material';

interface Notification {
    id: string;
    message: string;
    severity: AlertColor;
    autoHideDuration?: number;
}

interface NotificationContextType {
    showNotification: (message: string, severity?: AlertColor, autoHideDuration?: number) => void;
    showSuccess: (message: string, autoHideDuration?: number) => void;
    showError: (message: string, autoHideDuration?: number) => void;
    showWarning: (message: string, autoHideDuration?: number) => void;
    showInfo: (message: string, autoHideDuration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: ReactNode;
    maxNotifications?: number;
    defaultAutoHideDuration?: number;
}

export function NotificationProvider({ 
    children, 
    maxNotifications = 3,
    defaultAutoHideDuration = 4000 
}: NotificationProviderProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback((
        message: string, 
        severity: AlertColor = 'info', 
        autoHideDuration = defaultAutoHideDuration
    ) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newNotification: Notification = {
            id,
            message,
            severity,
            autoHideDuration,
        };

        setNotifications(prev => {
            const updated = [...prev, newNotification];
            // Limit the number of notifications shown at once
            return updated.slice(-maxNotifications);
        });
    }, [defaultAutoHideDuration, maxNotifications]);

    const showSuccess = useCallback((message: string, autoHideDuration?: number) => {
        showNotification(message, 'success', autoHideDuration);
    }, [showNotification]);

    const showError = useCallback((message: string, autoHideDuration?: number) => {
        showNotification(message, 'error', autoHideDuration);
    }, [showNotification]);

    const showWarning = useCallback((message: string, autoHideDuration?: number) => {
        showNotification(message, 'warning', autoHideDuration);
    }, [showNotification]);

    const showInfo = useCallback((message: string, autoHideDuration?: number) => {
        showNotification(message, 'info', autoHideDuration);
    }, [showNotification]);

    const handleClose = useCallback((notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const contextValue: NotificationContextType = {
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            
            {/* Render notifications */}
            {notifications.map((notification, index) => (
                <Snackbar
                    key={notification.id}
                    open={true}
                    autoHideDuration={notification.autoHideDuration}
                    onClose={() => handleClose(notification.id)}
                    anchorOrigin={{ 
                        vertical: 'bottom', 
                        horizontal: 'left' 
                    }}
                    sx={{
                        // Stack multiple notifications vertically
                        bottom: 24 + (index * 80),
                        zIndex: 2000 + index,
                    }}
                >
                    <Alert
                        onClose={() => handleClose(notification.id)}
                        severity={notification.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            ))}
        </NotificationContext.Provider>
    );
}

export function useNotifications(): NotificationContextType {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}