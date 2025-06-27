# V4 Queue Tree Visualization Design

## Overview

The v4 queue tree visualization is a React Flow-based component that displays the YARN capacity scheduler queue hierarchy. It provides an interactive tree view with capacity flows, live metrics, and staged change visualization.

## Technology Decision: React Flow over D3.js

### Why React Flow?

1. **Performance**: Optimized for large graphs with virtualization
2. **Features**: Built-in zoom, pan, minimap, controls
3. **React Integration**: Native React components with hooks
4. **Accessibility**: Better keyboard navigation and ARIA support
5. **Maintenance**: Active development and community

### Implementation Strategy

Copy and transform existing React Flow components rather than rewriting from scratch. This preserves the polished UI/UX while enabling clean v4 integration.

## Architecture

### Component Structure

```
src/v4/components/tree/
├── QueueVisualization.tsx        # Main export component
├── QueueVisualizationContainer.tsx # React Flow container
├── QueueCardNode.tsx             # Individual queue node
├── CustomFlowEdge.tsx            # Capacity flow edges
├── hooks/
│   ├── useQueueTreeData.ts       # Transform v4 store to React Flow
│   ├── useQueueActions.ts        # Encapsulate v4 store actions
│   └── useQueueSearch.ts         # Search functionality
└── utils/
    └── layout/
        └── DagreLayout.ts        # Automatic tree layout
```

### Data Flow

```
v4 Zustand Store (QueueNode)
    ↓
useQueueTreeData hook
    ↓
Transform to React Flow format
    ↓
DagreLayout (positioning)
    ↓
React Flow nodes & edges
    ↓
QueueCardNode (rendering)
```

## Key Components

### QueueVisualization

Entry point component that provides the tree visualization.

```typescript
interface QueueVisualizationProps {
  width?: number;
  height?: number;
  className?: string;
}
```

### QueueVisualizationContainer

Main container that manages React Flow instance and integrates with v4 store.

Key responsibilities:
- Create React Flow provider
- Handle node/edge interactions
- Manage selection state
- Coordinate with side panels

### QueueCardNode

Individual queue node component that displays:
- Queue name and path
- Capacity mode (percentage/weight/absolute)
- Capacity bars with live usage
- State badges (RUNNING/STOPPED)
- Staged change indicators
- Node label access indicators
- Resource usage metrics

### useQueueTreeData Hook

Core hook that transforms v4 store data to React Flow format.

```typescript
interface UseQueueTreeDataResult {
  nodes: Node<QueueNodeData>[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
}

function useQueueTreeData(): UseQueueTreeDataResult {
  const { queueTree, schedulerData } = useSchedulerStore();
  const stagedChanges = useSchedulerStore(state => state.stagedChanges);
  
  // Transform QueueNode hierarchy to flat React Flow nodes
  // Calculate capacity flows for edges
  // Apply staged change indicators
}
```

## Data Transformation

### QueueNode to React Flow Node

```typescript
// V4 Store Format
interface QueueNode {
  path: string;
  name: string;
  properties: Map<string, string>;
  metrics?: QueueMetrics;
  children: QueueNode[];
}

// React Flow Format
interface FlowNode {
  id: string;
  type: 'queueCard';
  position: { x: number; y: number };
  data: {
    queuePath: string;
    queueName: string;
    capacity: number;
    maxCapacity: number;
    state: 'RUNNING' | 'STOPPED';
    metrics: QueueMetrics;
    stagedStatus?: 'new' | 'modified' | 'deleted';
  };
}
```

### Property Access

Since v4 uses Map<string, string> for properties:

```typescript
// Get capacity from v4 QueueNode
const capacity = parseFloat(queue.properties.get('capacity') || '0');
const maxCapacity = parseFloat(queue.properties.get('maximum-capacity') || '100');
const state = queue.properties.get('state') as QueueState || 'RUNNING';
```

## Features

### Search Functionality

- Search by queue name or path
- Highlight matching nodes
- Filter tree to show only matches and ancestors
- Implemented directly on QueueNode structure

### Node Label Filtering

- Show queues with access to selected label
- Display label-specific capacities
- Indicate inherited vs configured access
- Use v4 labelConfigs Map

### Staged Changes Visualization

- Border color indicates change type:
  - Green: New queue
  - Orange: Modified queue
  - Red: Deleted queue
- Integrate with v4 stagedChanges array

### Comparison Mode

- Select multiple queues for comparison
- Side-by-side property view
- Add comparison state to v4 store if needed

## Interactions

### Queue Selection
```typescript
const handleNodeClick = (event, node) => {
  const store = useSchedulerStore.getState();
  // Update selected queue in v4 store
};
```

### Context Menu Actions
- Add child queue → `stageQueueAddition`
- Delete queue → `stageQueueRemoval`
- Edit properties → Open property editor

### Drag and Drop
- Disabled for v4 (queues can't be moved)
- Node positions auto-calculated by DagreLayout

## Performance Considerations

1. **Memoization**: Use React.memo for QueueCardNode
2. **Selective Updates**: Use Zustand selectors for minimal re-renders
3. **Virtualization**: React Flow handles viewport culling
4. **Layout Caching**: Cache DagreLayout results when tree structure unchanged

## Testing Strategy

1. **Unit Tests**
   - Data transformation logic
   - Search and filter functions
   - Layout calculations

2. **Integration Tests**
   - Store integration
   - User interactions
   - Staged change flows

3. **Visual Tests**
   - Component rendering
   - State variations
   - Responsive behavior

## Migration Phases

### Phase 1: Component Migration (2 days)
- Copy existing components
- Update imports to v4 types
- Remove legacy dependencies

### Phase 2: Data Integration (3 days)
- Implement useQueueTreeData hook
- Update property access for Map structure
- Connect staged changes

### Phase 3: Store Integration (2 days)
- Wire UI actions to v4 store
- Replace old hooks
- Test interactions

### Phase 4: Feature Preservation (3 days)
- Reimplement search
- Update node label filtering
- Add comparison mode

### Phase 5: Cleanup (2 days)
- Remove all legacy code
- Add comprehensive tests
- Document components

## Future Enhancements

1. **Alternative Views**
   - Table view for queue list
   - Sunburst chart for capacity distribution
   - Timeline view for changes

2. **Advanced Features**
   - Queue templates
   - Bulk operations
   - Capacity optimization suggestions

3. **Performance**
   - WebGL renderer for very large trees
   - Progressive loading for deep hierarchies