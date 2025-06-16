import { capacityValueSchema } from '../config/properties';

export type CapacityMode = 'percentage' | 'weight' | 'absolute';

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

/**
 * Parses a capacity string value into a structured object.
 * This function centralizes the logic for handling different capacity formats.
 * @param input The capacity string (e.g., "10%", "5w", "[memory=1024,vcores=2]").
 * @returns A ParsedCapacityValue object.
 */
export function parseCapacityValue(input: string): ParsedCapacityValue {
    const trimmed = input.trim();

    // First, ensure the input is valid according to our central schema
    try {
        capacityValueSchema.parse(trimmed);
    } catch {
        // If validation fails, return a default, safe value
        return {
            mode: 'percentage',
            value: '0%',
            parsed: { percentage: 0 },
        };
    }

    // Percentage mode: "10%" or "10.5%"
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

    // Fallback for any other invalid format that might have slipped through
    return {
        mode: 'percentage',
        value: '0%',
        parsed: { percentage: 0 },
    };
}