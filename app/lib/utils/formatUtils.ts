/**
 * Format memory value from MB to human-readable string
 * @param memoryMB Memory value in megabytes
 * @returns Formatted string (e.g., "512 MB", "1.5 GB")
 */
export const formatMemory = (memoryMB: number): string => {
    if (memoryMB < 1024) {
        return `${memoryMB} MB`;
    }
    const gb = memoryMB / 1024;
    return gb % 1 === 0 ? `${gb} GB` : `${gb.toFixed(1)} GB`;
};