import { ParsedQueue, Queue, ConfigurationResponse, ConfigProperty } from '../../types/Queue';
import { PropertyDefinition } from '../../config/properties';

export function createMockQueue(overrides: Partial<Queue> = {}): Queue {
    return {
        queueName: 'root',
        capacity: 100,
        usedCapacity: 0,
        maxCapacity: 100,
        absoluteCapacity: 100,
        absoluteUsedCapacity: 0,
        absoluteMaxCapacity: 100,
        state: 'RUNNING',
        numApplications: 0,
        resourcesUsed: {
            memory: 0,
            vCores: 0,
        },
        queues: {
            queue: [],
        },
        ...overrides,
    };
}

export function createMockParsedQueue(overrides: Partial<ParsedQueue> = {}): ParsedQueue {
    return {
        name: 'root',
        path: 'root',
        parent: undefined,
        children: [],
        capacity: {
            value: '100%',
            mode: 'percentage',
            numericValue: 100,
        },
        maxCapacity: {
            value: '100%',
            mode: 'percentage',
            numericValue: 100,
        },
        state: 'RUNNING',
        properties: {},
        isLeaf: false,
        ...overrides,
    };
}

export function createMockConfiguration(
    overrides: Partial<ConfigurationResponse> = {}
): ConfigurationResponse {
    return {
        property: [
            { name: 'yarn.scheduler.capacity.root.queues', value: 'default' },
            { name: 'yarn.scheduler.capacity.root.capacity', value: '100' },
            { name: 'yarn.scheduler.capacity.root.default.capacity', value: '100' },
            { name: 'yarn.scheduler.capacity.root.default.maximum-capacity', value: '100' },
            { name: 'yarn.scheduler.capacity.root.default.state', value: 'RUNNING' },
        ],
        ...overrides,
    };
}

export function createMockConfigProperty(overrides: Partial<ConfigProperty> = {}): ConfigProperty {
    return {
        name: 'yarn.scheduler.capacity.test.property',
        value: 'test-value',
        ...overrides,
    };
}

export function createMockPropertyDefinition(overrides: Partial<PropertyDefinition> = {}): PropertyDefinition {
    return {
        key: 'test-property',
        label: 'Test Property',
        type: 'text',
        defaultValue: 'default-value',
        description: 'Test property description',
        validation: {} as never, // Mock validation schema
        group: 'core',
        getValueFromQueue: () => 'test-value',
        ...overrides,
    };
}

export function createMockChildQueue(
    parent: string,
    name: string,
    capacity: number
): Queue {
    return createMockQueue({
        queueName: name,
        queuePath: `${parent}.${name}`,
        capacity,
        maxCapacity: 100,
        absoluteCapacity: capacity,
        absoluteMaxCapacity: 100,
    });
}

export function createMockParsedChildQueue(
    parent: string,
    name: string,
    capacity: number
): ParsedQueue {
    return createMockParsedQueue({
        name,
        path: `${parent}.${name}`,
        parent,
        capacity: {
            value: `${capacity}%`,
            mode: 'percentage',
            numericValue: capacity,
        },
        maxCapacity: {
            value: '100%',
            mode: 'percentage',
            numericValue: 100,
        },
    });
}

// Factory for complex queue hierarchies
export function createMockQueueHierarchy(): Queue {
    const production = createMockChildQueue('root', 'production', 70);
    const development = createMockChildQueue('root', 'development', 30);
    
    const prodTeam1 = createMockChildQueue('root.production', 'team1', 40);
    const prodTeam2 = createMockChildQueue('root.production', 'team2', 30);
    
    production.queues = {
        queue: [prodTeam1, prodTeam2],
    };
    
    return createMockQueue({
        queueName: 'root',
        queues: {
            queue: [production, development],
        },
    });
}

export function createMockParsedQueueHierarchy(): ParsedQueue {
    const production = createMockParsedChildQueue('root', 'production', 70);
    const development = createMockParsedChildQueue('root', 'development', 30);
    
    const prodTeam1 = createMockParsedChildQueue('root.production', 'team1', 40);
    const prodTeam2 = createMockParsedChildQueue('root.production', 'team2', 30);
    
    production.children = [prodTeam1, prodTeam2];
    
    return createMockParsedQueue({
        name: 'root',
        children: [production, development],
    });
}

// Mock form data factories
export function createMockFormData(overrides: Record<string, unknown> = {}) {
    return {
        queueName: 'test-queue',
        capacity: 50,
        maxCapacity: 100,
        state: 'RUNNING',
        ...overrides,
    };
}

// Mock siblings for capacity editor
export function createMockSiblings(count: number = 3) {
    return Array.from({ length: count }, (_, index) => ({
        name: `sibling-${index + 1}`,
        capacity: `${20 + index * 10}%`,
    }));
}