// Shared utility functions for property panel components

export const getStateColor = (state: string): 'success' | 'error' | 'default' => {
    switch (state) {
        case 'RUNNING':
            return 'success';
        case 'STOPPED':
            return 'error';
        default:
            return 'default';
    }
};

export const getCapacityPercentage = (used: number, max: number): number => (max > 0 ? (used / max) * 100 : 0);

export const getUsageColor = (percentage: number): 'primary' | 'warning' | 'error' => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'primary';
};