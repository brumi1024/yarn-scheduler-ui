# Test Factories Organization

This directory contains factory functions for creating test data, following the pattern described in CLAUDE.md.

## Current Structure

Currently, all factories are in `factories.ts` for simplicity since we only have 4 factory functions.

## Future Organization

As the codebase grows, consider splitting factories by domain:

```
src/testing/factories/
├── index.ts              # Barrel exports
├── queue-factories.ts    # Queue-related test data
├── property-factories.ts # Property descriptor test data
├── staged-change-factories.ts # Staged changes test data
├── node-label-factories.ts # Node label test data
├── scheduler-factories.ts # Scheduler data structures
└── resource-factories.ts # Resource info test data
```

## Guidelines

1. Each factory function should:
   - Accept an optional `Partial<T>` overrides parameter
   - Return a complete object with sensible defaults
   - Use the pattern `getMock<TypeName>()`

2. Group related factories together
3. Export all factories through the index.ts barrel file
4. Consider using factory builders for very complex objects
