# YARN Scheduler UI - Project Structure & Architecture

## Source Code Organization

### Main Application Structure

```
src/
├── App.tsx                 # Main application component
├── main.tsx               # Application entry point
├── theme.ts               # Material-UI theme configuration
├── components/            # Reusable UI components
├── features/             # Feature-specific components
├── hooks/                # Custom React hooks
├── store/                # Zustand stores for state management
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── api/                  # API service layer and mocks
├── config/               # Configuration and metadata
├── yarn-parser/          # YARN configuration parsing logic
└── test/                 # Test utilities and setup
```

## Key Architecture Patterns

### State Management

- **Zustand Stores**: Multiple focused stores (dataStore, uiStore, changesStore, etc.)
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management with Zod validation

### Feature Organization

- **Queue Editor**: Main queue management interface
    - Components: Visualization, modals, panels
    - Hooks: Data processing, queue operations
    - Utils: Layout algorithms (Dagre), tree building
- **Node Labels**: Node label management interface
- **Global Settings**: System-wide configuration
- **Diagnostics**: Debugging and export utilities

### Component Hierarchy

- **Layout Components**: MainLayout, TabNavigation, StatusBar
- **Feature Components**: QueueEditor, NodeLabels, GlobalSettings
- **Shared Components**: ConfirmationModal, ErrorBoundary, forms
- **Visualization Components**: QueueVisualization, QueueCardNode

### Data Flow

1. API calls managed by React Query
2. Server data stored in dataStore (Zustand)
3. UI state managed in uiStore
4. Changes staged in changesStore
5. Components subscribe to relevant store slices

### Configuration-Driven Architecture

- Property definitions in `src/config/`
- Metadata-driven form generation
- Type-safe configuration with Zod schemas

## Key Files & Directories

### Core Application

- `App.tsx`: Main app with routing and providers
- `MainLayout.tsx`: Primary layout component
- `theme.ts`: Material-UI theme customization

### Data Layer

- `api/ApiService.ts`: HTTP client for YARN APIs
- `store/`: Zustand stores for different concerns
- `hooks/useYarnApi.ts`: React Query hooks for API calls

### Configuration Management

- `config/properties.ts`: Queue property definitions
- `config/globalProperties.ts`: Global property definitions
- `yarn-parser/`: Configuration parsing logic

### Testing Infrastructure

- `test/setup.ts`: Global test configuration
- `test/testUtils.tsx`: Testing utilities and wrappers
- `__tests__/`: Component and unit tests
