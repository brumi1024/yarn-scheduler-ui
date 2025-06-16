// src/utils/capacity.ts

export type CapacityMode = 'percentage' | 'weight' | 'absolute' | 'unknown';

export interface ParsedCapacityValue {
    mode: CapacityMode;
    value: string;
    parsed?: {
        percentage?: number;
        weight?: number;
        memory?: number;
        vcores?: number;
    };
}

export function getCapacityMode(value: string): CapacityMode {
    if (value.startsWith('[')) {
        return 'absolute';
    }
    if (value.endsWith('w')) {
        return 'weight';
    }
    if (!isNaN(parseFloat(value))) {
        return 'percentage';
    }
    return 'unknown';
}

export function parseCapacity(value: string) {
    const mode = getCapacityMode(value);
    return { mode, value };
}

export function parseCapacityValue(input: string): ParsedCapacityValue {
    const trimmed = input.trim();

    // Percentage mode: "10%" or "10.5%" or raw numbers
    if (trimmed.endsWith('%')) {
        const percentage = parseFloat(trimmed.slice(0, -1));
        return {
            mode: 'percentage',
            value: trimmed,
            parsed: { percentage: isNaN(percentage) ? 0 : percentage },
        };
    }

    // Weight mode: "2w" or "1.5w"
    if (trimmed.endsWith('w')) {
        const weight = parseFloat(trimmed.slice(0, -1));
        return {
            mode: 'weight',
            value: trimmed,
            parsed: { weight: isNaN(weight) ? 0 : weight },
        };
    }

    // Absolute mode: "[memory=2048,vcores=2]"
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const resourceStr = trimmed.slice(1, -1);
        const resources = resourceStr.split(',').reduce(
            (acc, pair) => {
                const [key, val] = pair.split('=');
                if (key && val) {
                    acc[key.trim()] = parseInt(val.trim(), 10);
                }
                return acc;
            },
            {} as Record<string, number>
        );
        return {
            mode: 'absolute',
            value: trimmed,
            parsed: {
                memory: resources.memory || 0,
                vcores: resources.vcores || 0,
            },
        };
    }

    // Raw number (assume percentage)
    const rawNumber = parseFloat(trimmed);
    if (!isNaN(rawNumber)) {
        return {
            mode: 'percentage',
            value: `${rawNumber}%`,
            parsed: { percentage: rawNumber },
        };
    }

    // Fallback for any other invalid format
    return {
        mode: 'percentage',
        value: '0%',
        parsed: { percentage: 0 },
    };
}

export function toDisplayPercentage(capacityValue: ParsedCapacityValue): number {
    switch (capacityValue.mode) {
        case 'percentage':
            return capacityValue.parsed?.percentage ?? 0;
        case 'weight':
            // Weight values are displayed as-is (they're relative within siblings)
            return capacityValue.parsed?.weight ?? 0;
        case 'absolute':
            // Absolute values cannot be converted to percentage without parent context
            return 0;
        default:
            return 0;
    }
}
