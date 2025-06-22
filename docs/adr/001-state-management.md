# ADR 001: State Management with Zustand

## Status

Accepted

## Context

We need a state management solution for the YARN Scheduler UI that:

- Provides excellent TypeScript support with minimal boilerplate
- Allows modular organization of different data domains
- Supports persistence where needed (UI preferences, draft changes)
- Enables efficient component updates and performance optimization
- Is maintainable and testable by the development team

### Requirements Analysis

The application manages several distinct types of state:

1. **Server State**: Queue configurations, node labels, cluster information
2. **UI State**: Modal visibility, selected items, user preferences, notifications
3. **Transient State**: Staged configuration changes, form data, search filters
4. **Activity State**: User action logs, API call history, debugging information

### Alternatives Considered

#### Redux Toolkit

**Pros:**

- Industry standard with extensive ecosystem
- Excellent DevTools support
- Time-travel debugging capabilities
- Large community and resources

**Cons:**

- Significant boilerplate even with Redux Toolkit
- Complex setup for TypeScript integration
- Large bundle size (~60KB with dependencies)
- Steeper learning curve for new developers
- Provider component adds React tree depth

#### Context API + useReducer

**Pros:**

- Built into React, no additional dependencies
- Familiar pattern for React developers
- Good TypeScript support

**Cons:**

- Performance issues with frequent updates
- Lacks persistence capabilities
- No built-in debugging tools
- Becomes unwieldy with complex state

#### Jotai/Recoil

**Pros:**

- Atomic state management
- Excellent performance characteristics
- Modern approach to state management

**Cons:**

- Smaller ecosystem and community
- Additional learning curve
- Less mature tooling
- Atomic approach may be overkill for our use case

## Decision

We will use **Zustand** with multiple domain-specific stores.

### Rationale

Zustand provides the best balance of simplicity, performance, and functionality for our specific needs:

1. **Minimal Boilerplate**: Store definition is straightforward and readable
2. **Excellent TypeScript Integration**: Built-in type inference with minimal configuration
3. **Small Bundle Size**: ~8KB total vs 60KB+ for Redux solutions
4. **Performance**: No Provider component, selective subscriptions prevent unnecessary re-renders
5. **Persistence**: Built-in middleware for localStorage/sessionStorage
6. **Testing**: Simple to mock and test store implementations
7. **DevTools**: Official Redux DevTools integration available

### Store Architecture

We implement a **multi-store pattern** with domain separation:

```typescript
// Data Store - Server-side state
interface DataStore {
    configuration: ConfigurationResponse | null;
    queues: Queue[];
    setConfiguration: (config: ConfigurationResponse) => void;
    addQueue: (queue: Queue) => void;
}

// UI Store - Interface state with persistence
interface UIStore {
    selectedQueuePath: string | null;
    modals: ModalState;
    notifications: NotificationState;
    theme: ThemePreferences;
}

// Changes Store - Transient change tracking
interface ChangesStore {
    stagedChanges: ChangeSet[];
    conflicts: ConflictInfo[];
    stageChange: (change: ChangeSet) => void;
    applyChanges: () => Promise<void>;
}
```

### Benefits of Multi-Store Pattern

1. **Clear Separation of Concerns**: Each store has a single responsibility
2. **Type Safety**: Smaller interfaces are easier to type and maintain
3. **Performance**: Components only re-render when relevant state changes
4. **Testing**: Each store can be tested independently
5. **Code Organization**: Related state and actions are co-located

## Implementation Guidelines

### Store Definition Pattern

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyStore {
    // State
    data: MyData | null;
    loading: boolean;

    // Actions
    setData: (data: MyData) => void;
    fetchData: () => Promise<void>;
}

export const useMyStore = create<MyStore>((set, get) => ({
    // Initial state
    data: null,
    loading: false,

    // Actions
    setData: (data) => set({ data }),
    fetchData: async () => {
        set({ loading: true });
        try {
            const result = await apiService.fetchData();
            set({ data: result, loading: false });
        } catch (error) {
            set({ loading: false });
            // Handle error
        }
    },
}));
```

### Component Usage Pattern

```typescript
// Selective subscription (recommended)
function MyComponent() {
    const data = useMyStore((state) => state.data);
    const fetchData = useMyStore((state) => state.fetchData);

    // Component logic
}

// Multiple values with shallow equality
function MyOtherComponent() {
    const { data, loading } = useMyStore((state) => ({ data: state.data, loading: state.loading }), shallow);
}
```

### Testing Pattern

```typescript
// Mock store for testing
const createMockStore = (initialState: Partial<MyStore> = {}) => {
  return create<MyStore>(() => ({
    data: null,
    loading: false,
    setData: vi.fn(),
    fetchData: vi.fn(),
    ...initialState,
  }));
};

// Test usage
it('renders data correctly', () => {
  const mockStore = createMockStore({ data: mockData });
  render(<MyComponent />, { wrapper: StoreProvider });
});
```

## Consequences

### Positive

- **Reduced Development Time**: Minimal boilerplate speeds up feature development
- **Better Developer Experience**: Excellent TypeScript inference and IDE support
- **Improved Performance**: Selective subscriptions and no Provider overhead
- **Easier Testing**: Simple mocking and isolated store testing
- **Smaller Bundle**: Significant reduction in JavaScript bundle size
- **Better Debugging**: Clear state updates and action tracing

### Negative

- **Smaller Ecosystem**: Fewer third-party integrations compared to Redux
- **No Time-Travel Debugging**: Limited compared to Redux DevTools (though Redux DevTools integration is available)
- **Learning Curve**: Team needs to learn Zustand patterns (minimal impact)
- **Manual DevTools Integration**: Requires explicit setup for advanced debugging

### Mitigation Strategies

1. **Documentation**: Comprehensive examples and patterns documented
2. **Training**: Team knowledge sharing sessions on Zustand patterns
3. **Standards**: Consistent store structure and naming conventions
4. **DevTools Setup**: Configure Redux DevTools integration for debugging

## Examples

### Basic Store Implementation

```typescript
interface DataStore {
    configuration: ConfigurationResponse | null;
    setConfiguration: (config: ConfigurationResponse) => void;
    clearConfiguration: () => void;
}

const useDataStore = create<DataStore>((set) => ({
    configuration: null,
    setConfiguration: (configuration) => set({ configuration }),
    clearConfiguration: () => set({ configuration: null }),
}));
```

### Store with Persistence

```typescript
interface UIStore {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    toggleTheme: () => void;
    setSidebarOpen: (open: boolean) => void;
}

const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            theme: 'light',
            sidebarOpen: true,
            toggleTheme: () =>
                set((state) => ({
                    theme: state.theme === 'light' ? 'dark' : 'light',
                })),
            setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
        }),
        {
            name: 'ui-preferences',
            partialize: (state) => ({ theme: state.theme, sidebarOpen: state.sidebarOpen }),
        }
    )
);
```

### Store with Async Actions

```typescript
interface ChangesStore {
    stagedChanges: ChangeSet[];
    isApplying: boolean;
    stageChange: (change: ChangeSet) => void;
    applyChanges: () => Promise<void>;
}

const useChangesStore = create<ChangesStore>((set, get) => ({
    stagedChanges: [],
    isApplying: false,

    stageChange: (change) =>
        set((state) => ({
            stagedChanges: [...state.stagedChanges, change],
        })),

    applyChanges: async () => {
        const { stagedChanges } = get();
        set({ isApplying: true });

        try {
            await apiService.applyChanges(stagedChanges);
            set({ stagedChanges: [], isApplying: false });
        } catch (error) {
            set({ isApplying: false });
            throw error;
        }
    },
}));
```

## Monitoring and Evolution

### Success Metrics

- **Developer Productivity**: Reduced time to implement new features
- **Bundle Size**: Maintain <500KB total JavaScript bundle
- **Performance**: No unnecessary re-renders in component profiling
- **Bug Rate**: Fewer state-related bugs compared to previous solutions

### Review Points

- **6 months**: Evaluate developer satisfaction and productivity gains
- **1 year**: Consider if the ecosystem has evolved to require changes
- **Major releases**: Re-evaluate if new React features affect the decision

This ADR establishes Zustand as our state management solution while providing clear patterns and guidelines for consistent implementation across the application.
