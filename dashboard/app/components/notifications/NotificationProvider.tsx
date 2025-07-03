import React from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

interface NotificationProviderProps {
    children: ReactNode;
}

// Simple provider that just passes through children
// Sonner handles its own state management
export function NotificationProvider({ children }: NotificationProviderProps) {
    return <>{children}</>;
}

// Direct usage of Sonner's toast API
export function useNotifications() {
    return {
        showSuccess: (message: string) => toast.success(message),
        showError: (message: string) => toast.error(message),
        showWarning: (message: string) => toast.warning(message),
        showInfo: (message: string) => toast.info(message),
        showNotification: (message: string) => toast(message),
    };
}