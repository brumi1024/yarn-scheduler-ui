# Extending Scheduler Properties

This guide explains how to make new Capacity Scheduler properties editable in the UI and how to add validation for them. Follow the relevant section depending on whether you are working with global scheduler settings or queue-level configuration.

## Key modules

- `src/config/properties/global-properties.ts`: property descriptors that drive the Global Settings page.
- `src/config/properties/queue-properties.ts`: queue-level property descriptors used by the property editor and queue creation flows.
- `src/config/schemas/validation.ts`: reusable Zod validators for common formats (capacity strings, percentages, ACLs, etc.).
- `src/utils/validation/businessRules`: business-rule validators that enforce cross-field or cross-queue constraints.
- `src/utils/validation/businessRules/ruleCategories.ts`: maps validation rule IDs to severity/behavior so the UI knows if an error blocks staging.
- `src/config/__tests__/propertyDefinitions.test.ts`: regression tests that assert descriptor consistency.

## Adding a global property

1. **Define the descriptor** in `src/config/properties/global-properties.ts`.
   - Global descriptors must use the fully qualified key (for example, `yarn.scheduler.capacity.maximum-applications`).
   - Set `displayName`, `description`, `type`, `category`, `defaultValue`, and `required`.
   - Add `validationRules` for basic checks (`range`, `pattern`, or `custom`). Import helpers from `src/config/schemas/validation.ts` when possible.
   - Provide `enumValues` when `type` is `enum`, and use `displayFormat` for human-friendly suffixes.

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

2. **Adjust the UI if needed.** The global settings screen renders inputs based on `PropertyDescriptor.type`. For custom widgets, extend `src/features/global-settings/components/PropertyInput.tsx`.
3. **Update tests.** If the new property should be covered by `propertyDefinitions.test.ts`, add expectations there.
4. **Verify** by running the app or unit tests (`npm run test`) and confirming the new field appears under the correct category with the expected validation message.

## Adding a queue-level property

1. **Add a descriptor** in `src/config/properties/queue-properties.ts`.
   - Queue descriptors omit the scheduler prefix; use the short key (`capacity`, `ordering-policy`, etc.).
   - Populate the same core fields as for global descriptors. Use `enableWhen` to express dependencies on other fields, and `dependsOn` to record soft dependencies for search.
   - If the property should be required for new queues, set `required: true` so the property editor enforces it.

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
       { type: 'custom', message: 'Must be zero or greater', validator: (value) => {
         if (!value.trim()) return true;
         const parsed = Number(value);
         return !Number.isNaN(parsed) && parsed >= 0;
       } },
     ],
   },
   ```

2. **Consider label-aware properties.** If the property needs a node-label variant (`accessible-node-labels.<label>.…`), update the templates in `src/features/node-labels/utils/labelPropertyUtils.ts` so descriptors are generated for each label at runtime.
3. **Business validation (optional).** Queue properties participate in additional checks described in the next section. Register new rules whenever the field interacts with other properties or queues.
4. **Tests.** Extend `propertyDefinitions.test.ts` or add dedicated tests under `src/features/property-editor` / `src/stores` if the new property affects rendering or staged changes.

## Adding validation rules

There are two layers of validation:

1. **Form-level validation** (per-field checks)
   - Implement via the `validationRules` array on the descriptor. The property editor converts these into Zod schema rules (`range`, `pattern`, `custom`).
   - Reuse helpers from `src/config/schemas/validation.ts` when possible, or create a new schema in that file so it can be shared between global and queue properties.

2. **Business-rule validation** (cross-field / cross-queue logic)
   - Create or update a validator in `src/utils/validation/businessRules` (for example, add a new function in an existing file or a new module).
   - Register the validator in `BusinessValidationService.registerValidators()` inside `src/utils/validation/businessRules/service.ts` by calling `this.addValidator('<property-name>', [validatorFn])`.
   - Assign a `rule` identifier in the returned `BusinessValidationError`. Add that identifier to `CROSS_QUEUE_RULES`, `QUEUE_SPECIFIC_RULES`, or `WARNING_ONLY_RULES` in `ruleCategories.ts` to control whether the error blocks staging.
   - Write unit tests alongside the validator (see existing `*.test.ts` files in the same directory) to cover success, warning, and error scenarios.
   - For global properties, the same service is invoked with `queuePath === 'global'`, so reuse the existing pipeline to emit either blocking errors or warnings.

After adding validation, run `npm run test` (or targeted `vitest` suites) to ensure new rules behave as expected.

## Sanity checklist

- [ ] Descriptor added to the appropriate file with accurate metadata.
- [ ] UI renders the expected input type (extend components if necessary).
- [ ] Form-level validation rules cover basic formatting/limits.
- [ ] Business-rule validators registered (when required) and categorized.
- [ ] Tests updated or added, and `npm run test` completes successfully.
