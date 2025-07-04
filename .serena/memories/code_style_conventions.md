# YARN Scheduler UI - Code Style & Conventions

## Prettier Configuration

- **Semicolons**: Required (semi: true)
- **Quotes**: Single quotes preferred (singleQuote: true)
- **Trailing Commas**: ES5 style (trailingComma: 'es5')
- **Line Width**: 120 characters maximum (printWidth: 120)
- **Indentation**: 4 spaces (tabWidth: 4)
- **Arrow Functions**: Always use parentheses around parameters (arrowParens: 'always')

## ESLint Rules

- **TypeScript**: Extends recommended TypeScript ESLint rules
- **React**: React hooks rules enforced
- **Console**: `console.log` and `console.debugger` produce warnings (except in mock files)
- **Unused Variables**: Error for unused variables with specific ignore patterns
- **Curly Braces**: Required for all control statements
- **Const Preference**: Prefer const over let when possible

## Naming Conventions

- **Components**: PascalCase (e.g., `QueueVisualization`, `NodeLabelsSection`)
- **Files**: PascalCase for components, camelCase for utilities
- **Hooks**: Start with "use" prefix (e.g., `useQueueDataProcessor`)
- **Types/Interfaces**: PascalCase (e.g., `QueueNodeData`, `LayoutOptions`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `QUEUE_PROPERTIES`)

## File Organization

- **Components**: Organized by feature in `src/components/` and `src/features/`
- **Hooks**: Custom hooks in `src/hooks/` and feature-specific in feature directories
- **Types**: Centralized in `src/types/` by domain
- **Utils**: Helper functions in `src/utils/`
- **Store**: State management in `src/store/`
- **Tests**: Co-located with components using `.test.tsx` or `.spec.ts`

## React Patterns

- **Functional Components**: Prefer function components over class components
- **Hooks**: Use custom hooks for shared logic
- **Props Interfaces**: Define TypeScript interfaces for all component props
- **Default Exports**: Use for main components, named exports for utilities

## TypeScript Guidelines

- **Strict Mode**: Enabled with strict type checking
- **Interface over Type**: Prefer interfaces for object shapes
- **Explicit Return Types**: For complex functions and public APIs
- **Generic Types**: Use when appropriate for reusability

## Import Order & Style

- External libraries first
- Internal modules grouped by type (components, hooks, utils)
- Relative imports last
- Use consistent import styles (default vs named imports)
