# YARN Scheduler UI Architecture

## Overview

The YARN Scheduler UI is a React-based application for managing Apache Hadoop YARN Capacity Scheduler configurations. The application provides an intuitive visual interface for viewing, editing, and managing queue hierarchies in YARN clusters.

## Core Architecture Principles

### 1. State Management

We use a multi-store approach with Zustand for different domains:

- `dataStore`: Manages server-side configuration data and queue hierarchies
- `uiStore`: Handles UI state (selections, modals, notifications) with persistence
- `changesStore`: Tracks pending configuration changes with conflict detection
- `activityStore`: Logs user actions and API calls for debugging
- `nodeLabelStore`: Manages node label configurations and pending changes

**Why multiple stores?**

- **Separation of concerns**: Each store has a single responsibility
- **Better TypeScript typing**: Smaller interfaces are easier to maintain
- **Granular performance optimization**: Components only re-render when relevant state changes
- **Independent testing**: Each store can be tested in isolation

### 2. Form Handling

We use React Hook Form with Zod validation:

- **Type-safe form schemas**: Zod provides runtime validation with TypeScript inference
- **Declarative validation rules**: Clear separation between validation logic and UI
- **Efficient re-renders**: React Hook Form minimizes unnecessary component updates
- **Centralized form components**: Reusable form fields with consistent styling

### 3. Server State Management

React Query manages all server interactions:

- **Automatic caching and invalidation**: Reduces unnecessary network requests
- **Optimistic updates**: Immediate UI feedback for better user experience
- **Consistent error handling**: Centralized error management across the app
- **Background refetching**: Keeps data fresh without user intervention

## Project Structure

```
src/
├── api/                    # API service layer and mocks
│   ├── mocks/             # Mock data for development
│   └── ApiService.ts      # HTTP client and API abstractions
├── components/            # Shared UI components
│   ├── forms/             # Form components and utilities
│   ├── shared/            # Reusable UI components
│   └── __tests__/         # Component tests
├── config/                # Configuration definitions
│   ├── properties.ts      # Queue property definitions
│   └── globalProperties.ts # Global scheduler properties
├── features/              # Feature-specific modules
│   ├── queue-editor/      # Queue management functionality
│   │   ├── components/    # Queue-specific components
│   │   ├── hooks/         # Queue-related business logic
│   │   ├── types/         # Queue-specific type definitions
│   │   └── utils/         # Queue utilities and layout
│   ├── NodeLabels.tsx     # Node label management
│   ├── GlobalSettings.tsx # Global configuration
│   └── Diagnostics.tsx   # Debugging and export tools
├── hooks/                 # Custom React hooks
├── store/                 # Zustand state stores
│   ├── dataStore.ts       # Server data management
│   ├── uiStore.ts         # UI state with persistence
│   ├── changesStore.ts    # Change tracking
│   ├── activityStore.ts   # Activity logging
│   └── nodeLabelStore.ts  # Node label state
├── test/                  # Testing utilities
│   └── testUtils/         # Centralized test helpers
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
├── yarn-parser/           # YARN configuration parsing
└── theme.ts              # Material-UI theme configuration
```

## Key Design Decisions

### Why Zustand over Redux?

- **Simpler API**: Less boilerplate reduces development time
- **Better TypeScript support**: Out-of-the-box type inference
- **Smaller bundle size**: ~8KB vs ~60KB for Redux Toolkit
- **Performance**: No Provider component needed, reduces React tree depth
- **Developer Experience**: Easier debugging and store composition

### Why Separate Validation Layers?

We implement validation at three distinct levels:

1. **Parse-time validation** (ConfigParser): Ensures structural integrity of YARN configurations
2. **Business validation** (validation.ts): Enforces YARN-specific rules and constraints
3. **Form validation** (Zod schemas): Validates user input in real-time

Each layer serves different needs:

- **Parse-time**: Prevents malformed configurations from breaking the parser
- **Business**: Ensures configurations follow YARN scheduler rules
- **Form**: Provides immediate feedback to users during editing

### Why Custom Tree Operations?

The TreeBuilder class handles YARN-specific logic that generic tree libraries don't understand:

- **Capacity calculations**: Different modes (percentage, weight, absolute) with complex inheritance
- **Queue state propagation**: Parent-child relationships affect state transitions
- **Resource allocation rules**: YARN-specific constraints on resource distribution
- **Search and filtering**: Domain-specific search patterns for queue hierarchies

### Why Web Workers for Parsing?

Configuration parsing runs in Web Workers to:

- **Prevent UI blocking**: Large configurations don't freeze the interface
- **Improve perceived performance**: Parsing happens in background
- **Enable progress feedback**: Users see parsing progress for large files
- **Handle memory-intensive operations**: Isolated memory management

## Data Flow Architecture

### Configuration Updates

```
User Input → Form Validation → Staged Changes → Business Validation → API Request → Server
     ↓                                                                        ↓
UI Updates ← Store Updates ← Optimistic Update                    Server Response
```

### Queue Hierarchy Processing

```
YARN Config → Parser Worker → Parsed Queues → TreeBuilder → Layout Engine → Visualization
      ↓                                                              ↓
   Raw XML                                                    Positioned Nodes
```

### State Synchronization

```
Server State (React Query) ← → Local State (Zustand Stores) ← → UI Components
                    ↓                        ↓                        ↓
               Cache Management         Change Tracking         Real-time Updates
```

## Performance Considerations

### Component Optimization

- **React.memo**: Prevents unnecessary re-renders of expensive components
- **useMemo/useCallback**: Memoizes expensive calculations and functions
- **Virtual scrolling**: For large queue lists and configuration displays
- **Code splitting**: Lazy loading of feature modules

### State Management Performance

- **Selective subscriptions**: Components only subscribe to relevant store slices
- **Computed values**: Derived state is memoized to prevent recalculation
- **Debounced updates**: Input changes are debounced to reduce update frequency
- **Optimistic updates**: UI responds immediately to user actions

### Data Processing

- **Web Workers**: Heavy parsing operations don't block the main thread
- **Incremental updates**: Only modified parts of the tree are recalculated
- **Efficient data structures**: Tree operations use optimized algorithms
- **Request deduplication**: React Query prevents duplicate network requests

## Testing Strategy

### Component Testing

- **Render helpers**: Centralized utilities for consistent test setup
- **Mock factories**: Reliable test data generation
- **Accessibility testing**: Ensures components meet a11y standards
- **Visual regression**: Prevents unintended UI changes

### State Management Testing

- **Store isolation**: Each store is tested independently
- **Action testing**: All state mutations are validated
- **Side effect testing**: API calls and async operations are mocked
- **Integration testing**: Store interactions are verified

### API Testing

- **Mock Service Worker**: Realistic API simulation
- **Error scenarios**: Network failures and edge cases
- **Performance testing**: Response time validation
- **Contract testing**: API response validation

## Security Considerations

### Input Validation

- **Client-side validation**: Immediate feedback and basic security
- **Server-side validation**: Authoritative validation and sanitization
- **Schema validation**: Zod schemas prevent injection attacks
- **Configuration limits**: Prevent resource exhaustion attacks

### Data Protection

- **Sensitive data masking**: Credentials and sensitive configurations are masked
- **Audit logging**: All configuration changes are logged
- **Session management**: Proper session handling and timeout
- **CORS configuration**: Restricted cross-origin access

## Deployment Architecture

### Development

- **Local development**: Vite dev server with HMR
- **Mock APIs**: Full functionality without backend dependencies
- **Hot reloading**: Instant feedback during development
- **Type checking**: Real-time TypeScript validation

### Production

- **Static assets**: Optimized bundle served from CDN
- **API proxy**: Backend API integration
- **Error monitoring**: Centralized error tracking
- **Performance monitoring**: Real-time performance metrics

## Future Scalability

### Architectural Extensibility

- **Plugin system**: Modular feature additions
- **Micro-frontends**: Potential for team-based development
- **API versioning**: Backward compatibility for API changes
- **Internationalization**: Multi-language support structure

### Performance Scaling

- **Code splitting**: Granular module loading
- **Caching strategies**: Advanced caching for large deployments
- **Bundle optimization**: Tree shaking and dead code elimination
- **CDN integration**: Global content delivery

This architecture provides a solid foundation for a maintainable, performant, and scalable YARN management interface while following modern React development best practices.
