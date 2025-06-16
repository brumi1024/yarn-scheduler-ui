# YARN Scheduler UI Data Flow Architecture

## Overview

This document describes the complete data flow in the YARN Scheduler UI, from API calls to visualization rendering, and how configuration changes are staged and applied.

## Architecture Overview

The application uses React 19 with TypeScript, Material-UI, and Zustand for state management. The visualization is built with D3.js and HTML5 Canvas for high-performance rendering.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Material-UI v6 with Emotion styling
- **State**: Zustand (4 separate stores)
- **Visualization**: D3.js + HTML5 Canvas
- **Forms**: React Hook Form + Zod validation
- **API Mocking**: MSW (Mock Service Worker)

## State Management

The application uses four specialized Zustand stores:

### 1. Data Store (`dataStore.ts`)
Centralized API data management:
```typescript
interface DataStore {
  scheduler: SchedulerInfo | null;
  configuration: ConfigurationData | null;
  nodeLabels: NodeLabel[] | null;
  nodes: NodeInfo[] | null;
  loading: boolean;
  error: string | null;
  loadAllData: () => Promise<void>;
}
```

### 2. UI Store (`uiStore.ts`)
UI state and interactions:
```typescript
interface UIStore {
  selectedQueue: string | null;
  hoveredQueue: string | null;
  expandedQueues: Set<string>;
  viewSettings: ViewSettings;
  modals: ModalState;
  notifications: Notification[];
  setSelectedQueue: (queueId: string | null) => void;
  // ... other UI actions
}
```

### 3. Changes Store (`changesStore.ts`)
Change management system:
```typescript
interface ChangesStore {
  stagedChanges: Map<string, ConfigChange>;
  conflicts: Conflict[];
  applyChanges: () => Promise<void>;
  rollbackChanges: () => void;
  stageChange: (change: ConfigChange) => void;
}
```

### 4. Activity Store (`activityStore.ts`)
Activity logging and monitoring:
```typescript
interface ActivityStore {
  activities: Activity[];
  logActivity: (activity: Activity) => void;
  clearActivities: () => void;
}
```

## Data Flow Pipeline

### 1. API Layer (`ApiService.ts`)

The ApiService provides YARN REST API integration:

```typescript
class ApiService {
  // Core YARN APIs
  getScheduler(): Promise<SchedulerInfo>
  getConfiguration(): Promise<ConfigurationData>
  updateConfiguration(changes: ConfigurationUpdate): Promise<void>
  getNodeLabels(): Promise<NodeLabel[]>
  getNodes(): Promise<NodeInfo[]>
  
  // Health checking
  healthCheck(): Promise<boolean>
}
```

**API Endpoints:**
- `GET /ws/v1/cluster/scheduler` - Queue hierarchy and runtime metrics
- `GET /ws/v1/cluster/scheduler-conf` - Configuration properties
- `PUT /ws/v1/cluster/scheduler-conf` - Apply configuration changes
- `GET /ws/v1/cluster/nodes` - Node information
- `GET /ws/v1/cluster/get-node-labels` - Node labels

### 2. Data Processing

#### Configuration Parsing (`ConfigParser.ts`)

Transforms YARN's flat property structure into hierarchical queues:

```typescript
// Input: Flat YARN properties
{
  "property": [
    {"name": "yarn.scheduler.capacity.root.queues", "value": "default,production"},
    {"name": "yarn.scheduler.capacity.root.default.capacity", "value": "30"},
    {"name": "yarn.scheduler.capacity.root.production.capacity", "value": "70"}
  ]
}

// Output: Hierarchical queue structure
interface ParsedQueue {
  id: string;
  queueName: string;
  queuePath: string;
  capacity: number;
  maxCapacity: number;
  children: ParsedQueue[];
  properties: Record<string, any>;
}
```

#### Tree Building (`TreeBuilder.ts`)

Converts parsed configuration into visualization-ready data structures:

```typescript
interface LayoutQueue extends ParsedQueue {
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  absoluteCapacity: number;
  usedCapacity?: number;
  numApplications?: number;
  resourcesUsed?: ResourceInfo;
}
```

### 3. Data Integration Hooks (`useApiWithZustand.ts`)

React hooks that connect API data to Zustand stores:

```typescript
// Primary data hooks
const useScheduler = () => useQuery(['scheduler'], apiService.getScheduler);
const useConfiguration = () => useQuery(['configuration'], apiService.getConfiguration);
const useNodeLabels = () => useQuery(['nodeLabels'], apiService.getNodeLabels);
const useNodes = () => useQuery(['nodes'], apiService.getNodes);

// Mutation hooks
const useUpdateConfiguration = () => useMutation(apiService.updateConfiguration);
const useHealthCheck = () => useQuery(['health'], apiService.healthCheck);
```

### 4. Data Processing Hook (`useQueueDataProcessor.ts`)

Processes and merges API data for visualization:

```typescript
const useQueueDataProcessor = () => {
  const { scheduler, configuration } = useDataStore();
  
  return useMemo(() => {
    if (!scheduler || !configuration) return null;
    
    // Parse configuration into queue hierarchy
    const parsedQueues = ConfigParser.parse(configuration);
    
    // Merge with runtime data from scheduler
    const enrichedQueues = mergeRuntimeData(parsedQueues, scheduler);
    
    // Calculate layout positions
    const layoutQueues = TreeBuilder.buildLayout(enrichedQueues);
    
    return layoutQueues;
  }, [scheduler, configuration]);
};
```

## Visualization Pipeline

### 1. Queue Visualization Container (`QueueVisualizationContainer.tsx`)

Main visualization component that orchestrates the rendering:

```typescript
const QueueVisualizationContainer = () => {
  const queueData = useQueueDataProcessor();
  const { selectedQueue, hoveredQueue } = useUIStore();
  
  return (
    <CanvasDisplay 
      queues={queueData}
      selectedQueue={selectedQueue}
      hoveredQueue={hoveredQueue}
      onQueueSelect={handleQueueSelect}
      onQueueHover={handleQueueHover}
    />
  );
};
```

### 2. Canvas Display (`CanvasDisplay.tsx`)

D3.js-powered canvas rendering with interaction handling:

```typescript
const CanvasDisplay = ({ queues, selectedQueue, hoveredQueue, onQueueSelect, onQueueHover }) => {
  useEffect(() => {
    const canvas = d3.select(canvasRef.current);
    
    // Set up zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', handleZoom);
    
    canvas.call(zoom);
    
    // Render queue hierarchy
    renderQueues(queues, selectedQueue, hoveredQueue);
    
    // Handle interactions
    canvas.on('click', handleCanvasClick);
    canvas.on('mousemove', handleCanvasHover);
  }, [queues, selectedQueue, hoveredQueue]);
};
```

## Change Management System

### 1. Staging Changes

When users modify queue properties:

```typescript
const { stageChange } = useChangesStore();

const handleCapacityChange = (queuePath: string, newCapacity: number) => {
  const change: ConfigChange = {
    id: generateId(),
    queuePath,
    property: 'capacity',
    oldValue: currentCapacity.toString(),
    newValue: newCapacity.toString(),
    changeType: 'update',
    timestamp: Date.now()
  };
  
  stageChange(change);
};
```

### 2. Validation

Changes are validated before staging:

```typescript
const validateChange = (change: ConfigChange): ValidationResult => {
  switch (change.property) {
    case 'capacity':
      return validateCapacity(change.queuePath, change.newValue);
    case 'maximum-capacity':
      return validateMaxCapacity(change.queuePath, change.newValue);
    default:
      return { valid: true };
  }
};
```

### 3. Applying Changes

Staged changes are converted to YARN configuration format:

```typescript
const { applyChanges } = useChangesStore();

const applyChanges = async () => {
  // Convert staged changes to YARN XML format
  const configUpdate = generateConfigurationUpdate(stagedChanges);
  
  // Apply via API
  await apiService.updateConfiguration(configUpdate);
  
  // Refresh data
  await loadAllData();
  
  // Clear staged changes
  clearStagedChanges();
};
```

## Component Architecture

### Main Layout (`MainLayout.tsx`)

Tab-based navigation with feature-specific sections:

```typescript
const MainLayout = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TabPanel value={activeTab} index={0}>
        <QueueEditor />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <GlobalSettings />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <NodeLabels />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <Diagnostics />
      </TabPanel>
      <StatusBar />
    </Box>
  );
};
```

### Queue Editor (`features/queue-editor/`)

The main queue management interface:

- **QueueVisualization.tsx** - Layout and state management
- **QueueVisualizationContainer.tsx** - Data processing and event handling
- **CanvasDisplay.tsx** - D3.js rendering and interactions
- **PropertyEditor.tsx** - Queue property editing forms
- **StagedChangesPanel.tsx** - Change review and management

## Error Handling

### API Errors

```typescript
const handleApiError = (error: ApiError) => {
  const { addNotification } = useUIStore();
  
  switch (error.status) {
    case 400:
      addNotification({
        type: 'error',
        message: `Invalid configuration: ${error.message}`
      });
      break;
    case 403:
      addNotification({
        type: 'error',
        message: 'Permission denied'
      });
      break;
    default:
      addNotification({
        type: 'error',
        message: 'An unexpected error occurred'
      });
  }
};
```

### Validation Errors

```typescript
const handleValidationError = (error: ValidationError) => {
  const { setSelectedQueue, addNotification } = useUIStore();
  
  // Highlight problematic queue
  setSelectedQueue(error.queuePath);
  
  // Show error notification
  addNotification({
    type: 'error',
    message: error.message
  });
};
```

## Performance Optimizations

1. **Memoized Data Processing**: Queue data processing is memoized to prevent unnecessary recalculations
2. **Canvas Rendering**: Uses HTML5 Canvas with D3.js for high-performance visualization
3. **Selective Updates**: Only affected components re-render when store state changes
4. **Debounced Interactions**: User interactions are debounced to prevent excessive API calls
5. **Efficient State Management**: Zustand provides minimal re-renders with precise subscriptions

## Data Types

### Core Interfaces

```typescript
interface Queue {
  id: string;
  queueName: string;
  queuePath: string;
  capacity: number;
  maxCapacity: number;
  absoluteCapacity: number;
  usedCapacity: number;
  numApplications: number;
  resourcesUsed: ResourceInfo;
  children: Queue[];
  properties: Record<string, any>;
}

interface ConfigChange {
  id: string;
  queuePath: string;
  property: string;
  oldValue: string;
  newValue: string;
  changeType: 'create' | 'update' | 'delete';
  timestamp: number;
}

interface ValidationError {
  queuePath: string;
  property: string;
  message: string;
  severity: 'error' | 'warning';
}
```

## Activity Logging

All user actions and system events are logged:

```typescript
interface Activity {
  id: string;
  timestamp: number;
  type: 'user_action' | 'api_call' | 'error' | 'info';
  message: string;
  details?: any;
}

const { logActivity } = useActivityStore();

logActivity({
  id: generateId(),
  timestamp: Date.now(),
  type: 'user_action',
  message: 'Queue capacity changed',
  details: { queuePath: 'root.default', newCapacity: 30 }
});
```

This architecture provides a robust, scalable foundation for the YARN Scheduler UI with clear separation of concerns, efficient state management, and high-performance visualization capabilities.