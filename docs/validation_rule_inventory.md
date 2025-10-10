# Legacy Validation Inventory

Snapshot of the rules enforced by the existing validation stack. Each entry lists the trigger (field or action), when it fires, and the user-facing message(s) it can emit.

## Schema-Level Validators (`src/config/schemas/validation.ts`)

- `capacityValueSchema`
  - **Triggers**: Queue and label capacity inputs that opt into this schema (e.g., `capacity`, `maximum-capacity`, label-specific capacities).
  - **Message**: `Invalid capacity format. Use percentage (50), weight (2w), or absolute ([memory=1024,vcores=2])`.
  - **Notes**: Accepts `%`, `w`, absolute resource syntax, or plain numbers between 0–100; empty strings are allowed.
- `percentageSchema`
  - **Triggers**: Properties treated as generic percentages (0–100 range).
  - **Message**: `Must be a number between 0 and 100`.
- `positiveNumberSchema`
  - **Triggers**: Numeric fields that must be strictly positive.
  - **Message**: `Must be a positive number`.
- `nonNegativeNumberSchema`
  - **Triggers**: Numeric fields that must be ≥ 0.
  - **Message**: `Must be a non-negative number`.
- `integerSchema`
  - **Triggers**: Fields expecting positive integers.
  - **Message**: `Must be a positive integer`.
- `aclFormatSchema`
  - **Triggers**: ACL-style text inputs (queue access lists, etc.).
  - **Message**: `Invalid ACL format. Use "user1,user2 group1,group2" or "*" or " " (space for none)`.

## Business Validation Rules (`src/utils/validation/businessRules`)

### Capacity Rules (`capacityRules.ts`)

- `capacity-type-consistency`
  - **Trigger**: Field `capacity` in legacy mode with sibling queues.
  - **Message**: `All sibling queues must use the same capacity type (legacy mode requirement). Inconsistent siblings: <list>`.
  - **Severity**: error.
- `child-capacity-sum`
  - **Trigger**: Field `capacity` in legacy mode when validating a queue or on save.
  - **Message**: `Child queue capacities must sum to 100% (legacy mode requirement, current: <value>%)`.
  - **Severity**: error.
- `max-capacity-format-match`
  - **Trigger**: Field `maximum-capacity` when both capacity fields are present.
  - **Message**: `Maximum capacity must use the same format as capacity`.
  - **Severity**: error.
- `max-capacity-minimum`
  - **Trigger**: Field `maximum-capacity` when parsed as percentage ≥ capacity.
  - **Message**: `Maximum capacity must be greater than or equal to capacity`.
  - **Severity**: error.
- `parent-child-capacity-constraint`
  - **Trigger**: Field `capacity` for absolute resource definitions.
  - **Message**: `Child queue <resource> allocation (<value>) cannot exceed parent queue <resource> allocation (<value>)`.
  - **Severity**: warning.

### State Rules (`stateRules.ts`)

- `parent-state-dependency`
  - **Trigger**: Field `state` when switching to `RUNNING`.
  - **Message**: `Cannot set queue to RUNNING when parent is not RUNNING`.
  - **Severity**: error.
- `child-state-dependency`
  - **Trigger**: Field `state` when switching to `STOPPED`.
  - **Message**: `Cannot stop queue with <count> running child queue(s)`.
  - **Severity**: error.
- `deletion-state-requirement`
  - **Trigger**: Queue deletion operation.
  - **Message**: `Queue must be in STOPPED state before deletion`.
  - **Severity**: error.
- `deletion-empty-requirement`
  - **Trigger**: Queue deletion operation.
  - **Message**: `Queue has <count> active application(s) and cannot be deleted`.
  - **Severity**: error.
- `deletion-no-children-requirement`
  - **Trigger**: Queue deletion operation.
  - **Message**: `Queue has <count> child queue(s) and cannot be deleted`.
  - **Severity**: error.
- `conversion-state-requirement`
  - **Trigger**: Queue conversion operation.
  - **Message**: `Queue must be in STOPPED state before conversion`.
  - **Severity**: error.
- `conversion-empty-requirement`
  - **Trigger**: Queue conversion operation.
  - **Message**: `Queue has <count> active application(s) and cannot be converted`.
  - **Severity**: error.

### Lifetime Rules (`lifetimeRules.ts`)

- `lifetime-relationship` (default lifetime)
  - **Trigger**: Field `default-application-lifetime` when max lifetime exists.
  - **Message**: `Default lifetime (<seconds>s) cannot exceed maximum lifetime (<seconds>s)`.
  - **Severity**: error.
- `lifetime-relationship` (max lifetime)
  - **Trigger**: Field `maximum-application-lifetime` when default lifetime exists.
  - **Message**: `Maximum lifetime (<seconds>s) must be greater than or equal to default lifetime (<seconds>s)`.
  - **Severity**: error.
- `user-limit-factor-range`
  - **Trigger**: Field `user-limit-factor`.
  - **Message**: `User limit factor must be non-negative or -1 (as disabled)`.
  - **Severity**: error.
- `user-limit-factor-zero-warning`
  - **Trigger**: Field `user-limit-factor` when value is `0`.
  - **Message**: `User limit factor of 0 will prevent any user from submitting applications`.
  - **Severity**: warning.
- `minimum-user-limit-percent-max`
  - **Trigger**: Field `minimum-user-limit-percent` when value > 100.
  - **Message**: `Minimum user limit percent cannot exceed 100%`.
  - **Severity**: error.
- `minimum-user-limit-percent-warning`
  - **Trigger**: Field `minimum-user-limit-percent` when value == 100.
  - **Message**: `Setting minimum user limit to 100% means each user can get the entire queue capacity`.
  - **Severity**: warning.

### Label Rules (`labelRules.ts`)

- `queue-label-access`
  - **Trigger**: Field `accessible-node-labels` when child queue requests labels unavailable to parent.
  - **Message**: `Queue "<queuePath>" cannot access label "<label>": parent queue does not have access to this label`.
  - **Severity**: error.
- `label-capacity-sum`
  - **Trigger**: Pattern `accessible-node-labels.<label>.capacity` in legacy mode.
  - **Message**: `Label "<label>" capacities must sum to 100% across sibling queues (current: <value>%)`.
  - **Severity**: error.

## Cross-Queue & Auxiliary Validation (`src/utils/validation`)

- `businessValidation.validateQueue` (legacy mode sum check)
  - **Trigger**: Queue-level validation when legacy mode enabled.
  - **Message**: Reuses `child-capacity-sum` error above after aggregating children.
- `businessValidation.validateOperation('delete'|'convert')`
  - **Trigger**: Explicit delete/convert workflows.
  - **Message**: Reuses deletion/conversion errors above.

## Notes from `useQueueValidation.ts`

- Wraps Zod schema validators and business rules; exposes formatter errors alongside business errors.
- Triggers business validation on:
  - `handleBlur(field, value)` per-field.
  - `validateAll` across all configured properties (also rechecks child capacity sum in legacy mode).
- Warning collection is handled separately via `getFieldWarnings`.

This document should be kept until the new validation engine reaches feature parity.
