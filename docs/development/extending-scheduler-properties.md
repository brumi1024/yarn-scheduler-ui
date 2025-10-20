# Extending Scheduler Properties

This guide explains how to make new Capacity Scheduler properties editable in the UI and how to plug them into the rewritten validation system (see `docs/validation_overhaul.md` for the architecture overview). Follow the relevant section depending on whether you are working with global scheduler settings or queue-level configuration.

## Key modules

- `src/config/properties/global-properties.ts`: property descriptors that drive the Global Settings page.
- `src/config/properties/queue-properties.ts`: queue-level descriptors used by the property editor, queue dialogs, and staged changes.
- `src/config/schemas/validation.ts`: shared Zod helpers for common formats (capacity values, ACLs, percentages, etc.).
- `src/config/validation-rules.ts`: declarative business-validation rules evaluated for both global and queue properties.
- `src/contexts/ValidationContext.tsx`: React provider that keeps validation issues in sync with staged edits.
- `src/features/validation/service.ts`: utility entry points (`validateField`, `validateQueue`) used by hooks and slices.
- `src/features/validation/ruleCategories.ts`: maps rule IDs to blocking/non-blocking behavior.
- `src/config/__tests__/propertyDefinitions.test.ts`: regression tests that assert descriptor consistency.

## Adding a global property

1. **Define the descriptor** in `src/config/properties/global-properties.ts`.
   - Use the fully qualified key (for example, `yarn.scheduler.capacity.maximum-applications`).
   - Populate `displayName`, `description`, `type`, `category`, `defaultValue`, and `required`.
   - Use `validationRules` for field-level checks (`range`, `pattern`, or `custom`). Import helpers from `src/config/schemas/validation.ts` when possible so rules stay consistent.
   - Supply `enumValues` when `type` is `enum`. Each option should provide `{ value, label, description? }`. Use `enumDisplay` when you need `choiceCard`, `toggle`, or `select`.
   - Use `displayFormat` to add user-friendly suffixes to numeric inputs.

   ```ts
   {
     name: 'yarn.scheduler.capacity.sample-property',
     displayName: 'Sample Property',
     description: 'What this property controls.',
     type: 'number',
     category: 'general',
     defaultValue: '0',
     required: false,
     validationRules: [
       { type: 'range', message: 'Must be between 0 and 10', min: 0, max: 10 },
     ],
   },
   ```

2. **Adjust the UI if needed.** The global settings form renders inputs based on `PropertyDescriptor.type`. For bespoke widgets, extend `src/features/global-settings/components/PropertyInput.tsx`.
3. **Update tests.** Extend `src/config/__tests__/propertyDefinitions.test.ts` if you need coverage for descriptor metadata.
4. **Verify** by running the app or unit tests (`npm run test`) and confirming the new field renders with the expected validation feedback.

## Adding a queue-level property

1. **Add a descriptor** in `src/config/properties/queue-properties.ts`.
   - Queue descriptors use the short key (`capacity`, `maximum-capacity`, etc.).
   - Populate the same core fields as global descriptors. Use `enableWhen` for hard dependencies and `dependsOn` for soft discovery links.
   - For enum properties, keep the `{ value, label, description? }` shape and select an `enumDisplay` variant if the default toggle group is not ideal.
   - Set `required: true` if the field must be provided when adding new queues.

   ```ts
   {
     name: 'example-threshold',
     displayName: 'Example Threshold',
     description: 'Upper bound applied per queue.',
     type: 'number',
     category: 'limits',
     defaultValue: '',
     required: false,
     validationRules: [
       {
         type: 'custom',
         message: 'Must be zero or greater',
         validator: (value) => {
           if (!value.trim()) return true;
           const parsed = Number(value);
           return !Number.isNaN(parsed) && parsed >= 0;
         },
       },
     ],
   },
   ```

2. **Wire dependent UI.** Components such as `PropertyFormField` and `PropertyEditorTab` already read descriptors; only extend them if you need new interaction patterns.
3. **Tests.** Update `propertyDefinitions.test.ts` or add targeted tests under `src/features/property-editor` / `src/stores` when the new field affects staged-change flows or reducers.

## Working with validation

The validation pipeline has two layers that run automatically once descriptors and rules are defined.

### Form-level checks

- The `validationRules` array on a descriptor is compiled into Zod validators inside `src/features/property-editor/hooks/usePropertyEditor.ts`.
- Reuse the helpers in `src/config/schemas/validation.ts` whenever possible. Create new helpers there if the same rule will be reused by multiple properties.
- For global properties, `useGlobalPropertyValidation` invokes the same pipeline using the `global` queue path, so no extra wiring is required.

### Declarative business rules

Cross-field and cross-queue logic lives in `src/config/validation-rules.ts`. To add or modify a rule:

1. **Declare the rule** in the `QUEUE_VALIDATION_RULES` array (the name is historical; the same engine runs for global settings).
   ```ts
   {
     id: 'EXAMPLE_RULE',
     description: 'Describe the constraint',
     level: 'error',             // or 'warning'
     triggers: ['capacity'],     // fields that should cause this rule to re-run
     evaluate: (context) => {
       // context includes queuePath, fieldName, fieldValue, merged config, stagedChanges, etc.
       if (/* invalid */) {
         return [
           {
             queuePath: context.queuePath,
             field: 'capacity',
             message: 'Explain the problem.',
             severity: 'error',
             rule: 'example-rule',
           },
         ];
       }
       return [];
     },
   }
   ```
2. **Share utilities** by adding helpers in `src/features/validation/utils` when the logic is complex.
3. **Categorize severity (optional).** If the rule’s outcome should be treated as non-blocking despite returning `severity: 'error'`, update `src/features/validation/ruleCategories.ts` so `isBlockingError` reflects the desired behavior.
4. **Surface to the UI.** The `ValidationContext` automatically merges new rule output. Field-level components read `ValidationIssue[]` through `useValidation`, so no extra wiring is required beyond returning the correct `rule` ID and `severity`.
5. **Test it.** Add unit tests near the rule implementation (for example, under `src/config/__tests__` or a new `*.test.ts` beside the helper) and run `npm run test`.

## Sanity checklist

- [ ] Descriptor added to the appropriate file with accurate metadata.
- [ ] UI renders the expected input type (extend components only if necessary).
- [ ] Form-level `validationRules` cover formatting and basic range checks.
- [ ] Declarative rule added to `src/config/validation-rules.ts` (and helper utilities or categories updated when needed).
- [ ] Tests updated or added, and `npm run test` completes successfully.
