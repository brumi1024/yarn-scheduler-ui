# V5 Migration Tracking: React Router v7 + shadcn/ui

## Overview

This document tracks the migration from the current V4 implementation (TanStack Router + MUI) to V5 (React Router v7 + shadcn/ui).

**Migration Started**: 2025-01-03
**Target Completion**: 4 weeks

## Migration Goals

1. **UI Consolidation**: Replace MUI with shadcn/ui + Tailwind CSS
2. **Router Modernization**: Migrate from TanStack Router to React Router v7
3. **Bundle Size Reduction**: Remove emotion, MUI dependencies
4. **Maintain Functionality**: Keep all existing features working
5. **Preserve Architecture**: Keep the well-designed V4 patterns

## Current Status: Migration Started

### Phase 1: Foundation Setup (Week 1) - COMPLETED

- [x] Create dashboard directory with React Router v7 setup
- [x] Set up shadcn/ui component library
- [x] Create MUI to shadcn/ui component mapping
- [x] Copy type definitions
- [x] Copy API client and utilities
- [x] Set up Zustand store
- [x] Create route structure matching current app
- [x] Set up MSW for development

### Phase 2: Component Migration (Weeks 2-3) - IN PROGRESS

#### Simple Components
- [x] Notifications (MUI Snackbar → shadcn/ui toast) - Using Sonner directly
- [x] Dialogs (MUI Dialog → shadcn/ui dialog) - AddQueueDialog, DeleteQueueDialog
- [ ] Forms (MUI TextField → shadcn/ui form)
- [x] Buttons (MUI Button → shadcn/ui button)
- [x] Icons (MUI Icons → lucide-react)

#### Layout Components
- [x] Property Panel (MUI Drawer → shadcn/ui sheet) - COMPLETED
- [x] Staged Changes (Keep drawer pattern, update styling) - COMPLETED
- [x] Context Menus (MUI Menu → shadcn/ui dropdown-menu) - QueueContextMenu
- [x] Tabs (MUI Tabs → shadcn/ui tabs) - COMPLETED in PropertyPanel (MUI Tabs → shadcn/ui tabs)

#### Complex Components
- [x] Queue Visualization (Keep React Flow v12, update card styling only) - QueueCardNode migrated
- [x] Property Editor (Keep React Hook Form, update field components) - COMPLETED with PropertyEditorTab
- [x] Queue Info Tab (Update styling only) - COMPLETED with QueueInfoTab (Update styling only)

### Phase 3: Router Migration (Week 3) - NOT STARTED

- [ ] Set up parallel routing
- [ ] Migrate root route
- [ ] Migrate queue routes
- [ ] Migrate node-labels route
- [ ] Migrate global-settings route
- [ ] Remove TanStack Router

### Phase 4: Optimization (Week 4) - NOT STARTED

- [ ] Remove MUI dependencies
- [ ] Remove emotion dependencies
- [ ] Update all tests
- [ ] Performance testing
- [ ] Bundle size analysis

## Architecture Decisions

### What We Keep
- **React Flow v12** with proportional Sankey edges
- **Zustand with immer** for state management
- **Staged changes architecture** (bottom drawer pattern)
- **Dual-loading** from `/scheduler` and `/scheduler-conf`
- **Property construction**: `yarn.scheduler.capacity.${queuePath}.${property}`
- **MSW** for development and testing
- **React Hook Form** for complex forms

### What We Change
- **MUI → shadcn/ui** for all UI components
- **emotion/styled → Tailwind CSS** for styling
- **TanStack Router → React Router v7** for routing
- **MUI Icons → lucide-react** for icons

### Component Mapping

| MUI Component | shadcn/ui Replacement | Notes |
|--------------|----------------------|-------|
| Drawer | Sheet | Keep drawer behavior |
| Snackbar | Toast | Simplify notification API |
| Dialog | Dialog | Direct replacement |
| TextField | Input + Label | Use with React Hook Form |
| Button | Button | Update variants |
| IconButton | Button (icon variant) | Use size="icon" |
| Tabs | Tabs | Keep tab structure |
| Menu | DropdownMenu | Update menu items |
| Paper | Card | For elevated surfaces |
| Box | div with Tailwind | Remove Box abstraction |
| Typography | HTML + Tailwind | Use semantic HTML |
| Accordion | Accordion | For staged changes |
| Chip | Badge | For status indicators |
| CircularProgress | Spinner (custom) | Create simple component |
| Alert | Alert | Direct replacement |

## File Structure (New)

```
dashboard/
├── app/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── tree/         # Queue visualization
│   │   ├── property-panel/
│   │   ├── staged-changes/
│   │   ├── notifications/
│   │   └── ...
│   ├── lib/
│   │   ├── api/          # YARN API client
│   │   ├── store/        # Zustand stores
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utilities
│   ├── routes/
│   │   ├── _index.tsx    # Main queue view
│   │   ├── queue.$path.tsx
│   │   ├── node-labels.tsx
│   │   └── global-settings.tsx
│   └── root.tsx          # Root layout
```

## Migration Rules

1. **Direct Migration Only**: No mapping layers or compatibility wrappers - migrate components directly
2. **Feature Parity**: Every feature must work identically
3. **Test Coverage**: Maintain or improve test coverage
4. **No Breaking Changes**: Users should not notice the migration
5. **Performance**: Should be equal or better than current
6. **KISS Principle**: Simplify during migration, don't add complexity

## Testing Strategy

1. **Unit Tests**: Update as components are migrated
2. **Integration Tests**: Ensure features work end-to-end
3. **Visual Tests**: Compare UI appearance
4. **Performance Tests**: Monitor bundle size and runtime

## Risk Mitigation

1. **Parallel Development**: Keep V4 working while building V5
2. **Feature Flags**: Toggle between implementations if needed
3. **Incremental Rollout**: Deploy component by component
4. **Rollback Plan**: Can revert to V4 at any time

## Success Criteria

- [ ] All features working identically to V4
- [ ] Bundle size reduced by at least 30%
- [ ] Performance metrics equal or better
- [ ] All tests passing
- [ ] No user-facing breaking changes
- [ ] Cleaner, more maintainable codebase

## Phase 1 Accomplishments

We've successfully set up the foundation for the V5 migration:

1. **Dashboard Structure**: Created a new React Router v7 app in `/dashboard` with proper routing
2. **shadcn/ui Components**: Installed all necessary shadcn/ui components (button, input, dialog, sheet, etc.)
3. **~~Component Compatibility Layer~~**: ~~Created ui-compat mapping~~ - Removed in favor of direct migration
4. **Code Migration**: Copied all types, API client, utilities, and store from V4
5. **Import Path Updates**: Fixed all import paths to use React Router's `~` alias
6. **Mock Data**: Reused existing mock data and MSW setup
7. **Route Structure**: Created placeholder routes matching the current app structure
8. **Notification System**: Simplified to use Sonner directly without mapping layers

## Phase 2 Progress

### Recent Accomplishments (2025-07-03)

1. **PropertyPanel Migration**: 
   - Migrated from MUI Drawer to shadcn/ui Sheet
   - Implemented all three tabs: Overview, Info, and Settings
   - Used shadcn/ui Tabs, Card, Badge, Progress, Accordion components
   - Integrated React Hook Form with shadcn/ui Form components
   - Created PropertyFormField component for consistent form fields
   - Simplified state management by removing URL-based panel state

2. **StagedChangesPanel Migration**:
   - Migrated from MUI Drawer to shadcn/ui Sheet (bottom position)
   - Created QueueChangeGroup component using Collapsible
   - Created DiffView component for change visualization
   - Implemented collapsible/expandable states
   - Added proper change grouping and animations

3. **Technical Improvements**:
   - Fixed import issues (FieldError type import, PropertyEditorTabHandle interface)
   - Replaced non-existent lucide-react icons (Memory → HardDrive)
   - Added React imports to all migrated components
   - Simplified PropertyPanel integration (removed routing complexity)

We've made significant progress on component migration:

1. **Queue Visualization**: 
   - Migrated QueueCardNode from MUI Card to shadcn/ui Card
   - Migrated QueueContextMenu to shadcn/ui DropdownMenu
   - Migrated AddQueueDialog and DeleteQueueDialog to shadcn/ui Dialog
   - Created QueueVisualizationContainer with React Flow v12 integration
   - Fixed all import paths and component integrations

2. **Infrastructure Setup**:
   - Set up MSW for mock data
   - Configured store initialization in layout
   - Added staged changes counter badge
   - Installed dagre for queue layout

3. **Phase 2 Completed Successfully**:
   - Property Panel fully migrated to shadcn/ui Sheet with all tabs
   - Staged Changes Panel migrated to shadcn/ui Sheet (bottom drawer)
   - Simplified PropertyPanel state management (removed URL-based state)
   - All components have proper React imports
   - Dev server running successfully on port 5174

## Next Steps

### Immediate Tasks
1. ✅ Dashboard dev server running and basic functionality verified
2. ✅ Queue Visualization component migrated (React Flow v12 retained)
3. ✅ Property Panel implemented using shadcn/ui Sheet
4. ✅ Staged Changes panel migrated with shadcn/ui components

### Next Tasks
1. Test the integrated PropertyPanel with queue selection
2. Migrate Node Labels page components
3. Migrate Global Settings page
4. Begin Phase 3: Router Migration

### Component Migration Priority
1. **High Priority**: Queue visualization, Property panel, Staged changes
2. **Medium Priority**: Node labels, Global settings
3. **Low Priority**: Dialogs, context menus, minor UI elements

### Technical Debt to Address
- Fix any remaining import path issues
- Set up proper TypeScript path aliases
- Configure MSW to work with React Router v7
- Add error boundaries
- Set up proper theme configuration

## Notes

- Using React Router v7's new features for better DX
- shadcn/ui provides better customization than MUI
- Tailwind CSS is more performant than emotion
- Keep the excellent V4 architecture patterns