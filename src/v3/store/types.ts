// Re-export all types from schemas
export type {
    Resources,
    QueueState,
    CapacityMode,
    CapacityValue,
    QueueConfig,
    QueueMetrics,
} from './schemas/coreSchemas';

export type { PropertyChange, NodeLabelAssignment, ChangeType, ChangeSet } from './schemas/changeSchemas';

export type { QueueNode, QueueTree, QueuePath, QueueOperation } from './schemas/queueSchemas';

export type {
    PropertyType,
    UIComponent,
    PropertyValidation,
    PropertyUIConfig,
    PropertyGroup,
    PropertyDefinition,
    PropertyDefinitions,
} from './schemas/propertySchemas';

export type {
    ValidationSeverity,
    ValidationRuleType,
    ValidationIssue,
    ValidationContext,
    ValidationResult,
    ValidationRuleDefinition,
} from './schemas/validationSchemas';

export type { NodeState, NodeInfo, NodeLabel, NodeToLabelsMapping, ClusterNode } from './schemas/nodeSchemas';

export type {
    ConfigProperty,
    ConfigurationResponse,
    QueueUpdateRequest,
    ConfigurationUpdateRequest,
    SchedulerResponse,
    NodeLabelsResponse,
    NodesResponse,
} from './schemas/apiSchemas';

// Additional store-specific types
export type CommitStatus = 'idle' | 'committing' | 'success' | 'error';

export interface StoreError {
    message: string;
    code?: string;
    timestamp: Date;
}
