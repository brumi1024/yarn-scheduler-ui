// Shared utility functions for queue info components

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

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getCapacityPercentage = (used: number, max: number): number => (max > 0 ? (used / max) * 100 : 0);

export const getUsageColor = (percentage: number): 'primary' | 'warning' | 'error' => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'primary';
};
