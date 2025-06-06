# UI Improvements Design Document

## Overview
This document outlines the design for five UI improvements to the YARN Scheduler UI, focusing on user experience consistency and better change management visibility.

## Feature Designs

### 1. Boolean Toggle Switches

#### Current State
- Boolean properties use dropdown selects with "true"/"false" options
- Inconsistent with modern UI patterns
- Requires extra clicks to change values

#### Proposed Solution
- Replace all boolean dropdowns with toggle switches
- Visual states: ON (blue/active) | OFF (gray/inactive)
- Maintain consistent height with other form inputs
- Add smooth transition animations (200ms)

#### Implementation Details
- **Location**: Modify `FormGenerator.js` to detect boolean type properties
- **Component**: Create reusable `ToggleSwitch` component
- **Styling**: Add `toggle-switch.css` with states matching existing theme
- **Accessibility**: Include ARIA labels and keyboard support (Space/Enter to toggle)

#### Impact
- No data model changes required
- Purely presentational change
- Affects all modals with boolean properties (Edit Queue, Global Config)

### 2. Unified Tooltip Behavior

#### Current State
- Queue cards: Tooltips appear on hover with smooth fade-in
- Edit modal: Different tooltip implementation/behavior
- Inconsistent user experience

#### Proposed Solution
- Extract queue card tooltip logic into shared `TooltipMixin` or utility
- Apply consistent positioning, timing, and styling across all tooltips
- Standard behavior:
  - Show on hover after 500ms delay
  - Hide immediately on mouse leave
  - Position intelligently to avoid viewport edges
  - Consistent styling (dark background, white text, subtle shadow)

#### Implementation Details
- **Shared Component**: Create `js/utils/TooltipHelper.js`
- **CSS**: Consolidate tooltip styles in `styles/tooltips.css`
- **Usage**: Update both `QueueCardView` and form generation logic

#### Impact
- Improves consistency across the application
- No functional changes, only UX improvements

### 3. Queue Card Tooltip Positioning Fix

#### Current State
- Tooltips for first queue in each column appear behind the control bar
- Makes tooltip content unreadable
- Poor user experience

#### Proposed Solution
- Implement smart positioning algorithm:
  ```javascript
  // Pseudo-code
  if (tooltipTop < controlBarHeight) {
    position = 'below-card';
  } else if (tooltipRight > viewportWidth) {
    position = 'left-of-card';
  } else {
    position = 'default';
  }
  ```
- Add CSS classes for different positioning scenarios
- Ensure tooltips always appear in readable locations

#### Implementation Details
- **Detection**: Calculate position relative to viewport and control bar
- **CSS Classes**: `.tooltip-position-below`, `.tooltip-position-left`, etc.
- **Z-index**: Ensure tooltips appear above all other elements (z-index: 9999)

#### Impact
- Fixes specific usability issue
- May interact with Feature #2 (unified tooltips)

### 4. Auto-Creation Mode Transition Warning

#### Current State
- Both v1 and v2 auto-creation can coexist
- v2 supported in both non-legacy mode AND legacy mode with weight-based queues
- No warning when switching modes might disable v1 settings

#### Proposed Solution
- When toggling `legacy-queue-mode.enabled` from true to false:
  1. Scan all queues for v1 auto-creation settings
  2. If found, show warning modal:
     ```
     ⚠️ Legacy Mode Change Warning
     
     Disabling legacy queue mode will remove the following 
     auto-creation v1 configurations:
     
     • root.marketing (auto-create-child-queue.enabled)
     • root.sales (auto-create-child-queue.enabled)
     
     These settings will be removed from the pending changes.
     You can review all changes before applying them.
     
     [Cancel] [Continue and Remove v1 Settings]
     ```
  3. If user continues, stage removal of v1 properties
  4. Mark affected queues in pending changes view

#### Implementation Details
- **Detection**: Add method to `QueueConfigurationManager` to find v1 auto-creation queues
- **Warning Modal**: New `LegacyModeTransitionModal` component
- **Auto-staging**: Automatically stage v1 property removals
- **Visual Indication**: Highlight auto-removed properties in pending changes

#### Impact
- Prevents configuration conflicts
- Requires coordination with pending changes view (Feature #5)
- Adds complexity but improves safety

### 5. Enhanced Pending Changes View

#### Current State
- Flat list of all changes
- No grouping by queue or type
- Property names shown without context
- Difficult to review complex change sets

#### Proposed Solution
```
📋 Pending Changes

━━━ Global Configuration ━━━
  
  yarn.scheduler.capacity.legacy-queue-mode.enabled
    true → false
  
  yarn.scheduler.capacity.maximum-applications
    10000 → 20000

━━━ Queue: root.marketing ━━━

  yarn.scheduler.capacity.root.marketing.capacity
    30 → 40
  
  yarn.scheduler.capacity.root.marketing.maximum-capacity
    50 → 60
  
  ❌ Removed Properties (auto-cleanup from legacy mode change):
  yarn.scheduler.capacity.root.marketing.auto-create-child-queue.enabled
    true → (removed)

━━━ Queue: root.engineering ━━━

  yarn.scheduler.capacity.root.engineering.state
    RUNNING → STOPPED

━━━ New Queue: root.engineering.ml ━━━
  
  yarn.scheduler.capacity.root.engineering.ml.capacity
    (new) → 10w
  
  yarn.scheduler.capacity.root.engineering.ml.maximum-capacity
    (new) → 100
```

#### Implementation Details
- **Grouping Logic**: 
  - Separate global properties (check with `_isGlobalCapacityProperty()`)
  - Group queue changes by queue path
  - Special section for removed properties
- **Full Property Names**: Show complete YARN property names for clarity
- **Visual Hierarchy**: Use borders, spacing, and icons to improve readability
- **Collapsible Sections**: Allow collapsing queue sections for large change sets
- **Change Indicators**:
  - ➕ New properties/queues
  - ✏️ Modified properties
  - ❌ Removed properties/queues
  - ⚠️ Auto-removed (from mode transitions)

#### Impact
- Significant improvement to change review process
- Integrates with Feature #4 (shows auto-removed properties)
- May require updates to `ViewDataFormatterService`

## Implementation Order & Dependencies

### Recommended Implementation Order:
1. **Feature #2** (Unified Tooltips) - Foundation for tooltip improvements
2. **Feature #3** (Tooltip Positioning) - Builds on unified tooltip system
3. **Feature #1** (Toggle Switches) - Independent, low risk
4. **Feature #5** (Enhanced Pending Changes) - Required for Feature #4
5. **Feature #4** (Mode Transition Warning) - Depends on improved pending changes view

### Dependency Graph:
```
Feature #2 (Unified Tooltips)
    ↓
Feature #3 (Tooltip Positioning)

Feature #5 (Enhanced Pending Changes)
    ↓
Feature #4 (Mode Transition Warning)

Feature #1 (Toggle Switches) - Independent
```

## Design Critique

### Strengths:
1. **Consistency**: Features #1, #2, #3 improve UI consistency
2. **Safety**: Feature #4 prevents configuration errors
3. **Clarity**: Feature #5 makes complex changes reviewable
4. **Incremental**: Each feature can be implemented independently
5. **No Breaking Changes**: All changes are backwards compatible

### Potential Concerns:

1. **Complexity in Feature #4**:
   - Auto-detection and removal adds "magic" behavior
   - **Mitigation**: Clear warnings and ability to cancel

2. **Performance for Feature #5**:
   - Grouping/sorting many changes could be slow
   - **Mitigation**: Implement efficient grouping algorithm, consider virtual scrolling for 100+ changes

3. **Toggle Switch Accessibility**:
   - Must ensure keyboard navigation works properly
   - **Mitigation**: Follow ARIA guidelines, test with screen readers

4. **Tooltip Z-index Conflicts**:
   - High z-index (9999) might conflict with modals
   - **Mitigation**: Use z-index management system (tooltip: 1000, modal: 2000, etc.)

### Alternative Approaches Considered:

1. **For Feature #4**: 
   - Alternative: Block mode change entirely if v1 settings exist
   - Rejected: Too restrictive, auto-cleanup with warning is better UX

2. **For Feature #5**:
   - Alternative: Tree view for changes
   - Rejected: Adds complexity without clear benefit

## Testing Considerations

1. **Toggle Switches**: Test keyboard navigation, screen reader compatibility
2. **Tooltips**: Test positioning edge cases (viewport boundaries)
3. **Mode Transition**: Test with various v1 configurations
4. **Pending Changes**: Test with large change sets (50+ changes)

## Maintenance Impact

- **Low**: Features #1, #2, #3 are UI-only changes
- **Medium**: Feature #5 requires ongoing maintenance as new property types are added
- **Medium**: Feature #4 adds mode-specific logic that must be maintained

## Conclusion

These improvements enhance usability while maintaining the project's KISS principle. The most complex feature (#4) provides significant safety benefits that justify its complexity. The implementation order ensures dependencies are handled properly and allows for incremental deployment.