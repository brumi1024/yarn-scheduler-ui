# V4 Implementation Plan

## Overview
Complete redesign of YARN Scheduler UI using dual-loading architecture as specified in `v4-state-store-design.md`.

## Key Architectural Changes
1. **Dual-loading approach**: Load tree structure from `/scheduler` (pre-built hierarchy with pre-parsed queue paths!) and config from `/scheduler-conf`
2. **Zustand + Immer**: Replace current state management with Zustand store
3. **Metadata-driven UI**: Use property descriptors for dynamic form generation
4. **Staged changes**: Local staging with preview before applying to YARN
5. **Simple property construction**: No parsing needed - just build keys using `yarn.scheduler.capacity.${queuePath}.${property}`
6. **Queue name restrictions**: No dots (.) allowed in queue names - YARN limitation

## Implementation Phases

### Phase 1: Foundation (Can be done in parallel)
- [x] Create v4 folder structure
- [x] Implement TypeScript types/interfaces
- [x] Create YARN API client (with React Query integration)
- [ ] Implement property utilities (simplified - no parsing needed)
- [ ] Create Zustand store skeleton

### Phase 2: Core Store Implementation
- [ ] Implement dual-loading logic (parallel fetch /scheduler + /scheduler-conf)
- [ ] Create staged change management (with global property support)
- [ ] Build mutation request builder (handle global-updates section)
- [ ] Add validation utilities (including queue name validation)
- [ ] Implement computed values/selectors
- [ ] Add traverseQueueTree function for combining data sources

### Phase 3: UI Migration
- [ ] Migrate queue tree visualization
- [ ] Migrate property editor
- [ ] Add change preview UI
- [ ] Implement node label UI

### Phase 4: Cleanup
- [ ] Remove old v2/v3 code
- [ ] Update documentation
- [ ] Final testing

## Success Criteria
- All existing functionality preserved
- Improved performance with dual-loading
- Clear separation of live data vs config
- Atomic configuration updates
- Better error handling and validation
- No manual tree parsing required
- Simple property key construction
- Proper queue name validation (no dots)

## Critical Design Decisions

### Simplified Property Handling
With the dual-loading approach, property handling is greatly simplified:
1. Queue paths come pre-parsed from `/scheduler` endpoint
2. Property keys are constructed using template literals: `yarn.scheduler.capacity.${queuePath}.${property}`
3. No complex parsing needed - eliminates issues with multi-part properties like `accessible-node-labels.<label>.capacity`

### Global Properties
Properties that apply to the entire scheduler (not specific queues):
- Use 'global' as the queuePath in staged changes
- Stored with full property names (e.g., `yarn.scheduler.capacity.maximum-applications`)
- Placed in 'global-updates' section of mutation requests

### Queue Naming
- Queue names cannot contain dots (.) - YARN uses dots as path separators
- No escaping mechanism exists
- UI must validate this constraint