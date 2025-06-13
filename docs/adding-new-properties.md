# Adding New Properties to the YARN Scheduler UI

This guide explains how to add new properties to the property editor in the YARN Scheduler UI. The system uses a metadata-driven approach, making it easy to add new configuration options.

## Overview

The property system consists of:

- **Metadata files** in `src/config/` that define property schemas
- **ConfigService** that provides access to property definitions
- **PropertyEditorModal** that generates forms dynamically
- **PropertyFormField** that renders appropriate input controls

## Step-by-Step Guide

### Step 1: Determine Property Category

First, decide where your property belongs:

- **Queue-specific properties** → `src/config/queue-metadata.ts`
- **Global scheduler settings** → `src/config/global-metadata.ts`
- **Auto-creation properties** → `src/config/auto-creation-metadata.ts`
- **Node label properties** → `src/config/node-label-metadata.ts`

### Step 2: Define the Property Metadata

#### For Queue Properties (Most Common)

Edit `src/config/queue-metadata.ts`:

```typescript
// Find the appropriate group or create a new one
{
  groupName: 'Resource Limits & Management',
  properties: {
    // Add your new property here
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.your-new-property`]: {
      key: 'your-new-property',
      displayName: 'Your Property Display Name',
      description: 'Detailed description of what this property does',
      type: 'string', // Options: 'string' | 'number' | 'boolean' | 'enum' | 'percentage'
      defaultValue: 'default-value',
      placeholder: 'Placeholder text',
      availableInTemplate: true, // Can be used in auto-creation templates
    },
  },
},
```

#### Property Type Examples

**String Property:**

```typescript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.queue-description`]: {
  key: 'queue-description',
  displayName: 'Queue Description',
  description: 'A text description of this queue\'s purpose',
  type: 'string',
  defaultValue: '',
  placeholder: 'Enter queue description',
  availableInTemplate: false,
}
```

**Number Property:**

```typescript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.minimum-allocation-mb`]: {
  key: 'minimum-allocation-mb',
  displayName: 'Minimum Allocation (MB)',
  description: 'Minimum memory allocation per container in MB',
  type: 'number',
  defaultValue: '1024',
  placeholder: 'Default: 1024',
  step: '512', // Optional: step increment for number input
  availableInTemplate: true,
}
```

**Boolean Property:**

```typescript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.enable-size-based-weight`]: {
  key: 'enable-size-based-weight',
  displayName: 'Enable Size-Based Weight',
  description: 'Whether to enable size-based weight for resource allocation',
  type: 'boolean',
  defaultValue: 'false',
  availableInTemplate: true,
}
```

**Enum Property:**

```typescript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.queue-priority`]: {
  key: 'queue-priority',
  displayName: 'Queue Priority',
  description: 'Priority level for this queue',
  type: 'enum',
  options: ['HIGH', 'NORMAL', 'LOW'],
  defaultValue: 'NORMAL',
  availableInTemplate: true,
}
```

**Percentage Property:**

```typescript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.guaranteed-allocation`]: {
  key: 'guaranteed-allocation',
  displayName: 'Guaranteed Allocation',
  description: 'Guaranteed resource allocation as a percentage (0.0 to 1.0)',
  type: 'percentage',
  defaultValue: '0.5',
  placeholder: 'Default: 0.5 (50%)',
  availableInTemplate: true,
}
```

### Step 3: Add Property Groups (If Needed)

If your property doesn't fit existing groups, create a new one:

```typescript
export const QUEUE_CONFIG_METADATA: ConfigGroup[] = [
    // ... existing groups ...
    {
        groupName: 'Custom Feature Settings',
        properties: {
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.custom-feature-enabled`]: {
                key: 'custom-feature-enabled',
                displayName: 'Enable Custom Feature',
                description: 'Enables the custom feature for this queue',
                type: 'boolean',
                defaultValue: 'false',
                availableInTemplate: false,
            },
            // Add more related properties here
        },
    },
];
```

### Step 4: Update Property Validation (If Needed)

If your property requires custom validation beyond the standard type validation, update `src/config/config-service.ts`:

```typescript
validateProperty(key: string, value: any): { valid: boolean; error?: string } {
  const property = this.getPropertyDefinition(key);
  if (!property) {
    return { valid: false, error: `Unknown property: ${key}` };
  }

  // Add custom validation for your property
  if (property.key === 'your-new-property') {
    // Custom validation logic
    if (value && !value.match(/^[A-Z]+$/)) {
      return { valid: false, error: 'Must contain only uppercase letters' };
    }
  }

  // ... existing validation code ...
}
```

### Step 5: Map Queue Data (For Display)

Update the data mapping in `src/components/PropertyEditorModal.tsx` to show current values:

```typescript
useEffect(() => {
    if (queue && open) {
        const initialData: Record<string, any> = {};

        // ... existing mappings ...

        // Add mapping for your new property
        initialData['your-new-property'] = queue.yourNewProperty || 'default-value';

        setFormData(initialData);
        setErrors({});
        setHasChanges(false);
        setTabValue(0);
    }
}, [queue, open]);
```

### Step 6: Handle Special Input Types (Optional)

If your property needs a custom input component, create one and update `PropertyFormField.tsx`:

```typescript
const renderField = () => {
  switch (property.type) {
    // ... existing cases ...

    case 'your-custom-type':
      return (
        <YourCustomInput
          value={value}
          onChange={onChange}
          error={error}
          property={property}
        />
      );

    default:
      // ... existing default case ...
  }
};
```

### Step 7: Test Your Property

1. **Start the development server:**

    ```bash
    npm start
    ```

2. **Test the property editor:**
    - Click on a queue in the visualization
    - Click the Edit button in the Queue Info Panel
    - Find your new property in the appropriate tab
    - Verify the input control renders correctly
    - Test validation by entering invalid values
    - Check that changes are tracked properly

### Step 8: Document Known Properties

Update `src/config/config-service.ts` to include your property name in the known properties list:

```typescript
private isKnownPropertyName(name: string): boolean {
  const knownProperties = [
    'capacity', 'maximum-capacity', 'state', 'user-limit-factor',
    'maximum-am-resource-percent', 'max-parallel-apps', 'ordering-policy',
    'disable_preemption', 'accessible-node-labels', 'auto-create-child-queue',
    'auto-queue-creation-v2',
    'your-new-property' // Add your property here
  ];

  return knownProperties.some(prop => name.includes(prop));
}
```

## Example: Adding a Complete Property

Let's add a "max-application-lifetime" property:

1. **Edit `src/config/queue-metadata.ts`:**

```typescript
{
  groupName: 'Resource Limits & Management',
  properties: {
    // ... existing properties ...
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.maximum-application-lifetime`]: {
      key: 'maximum-application-lifetime',
      displayName: 'Maximum Application Lifetime',
      description: 'Maximum lifetime of an application in seconds (0 for unlimited)',
      type: 'number',
      defaultValue: '0',
      placeholder: 'Default: 0 (unlimited)',
      step: '3600', // 1 hour increments
      availableInTemplate: true,
    },
  },
},
```

2. **Update `PropertyEditorModal.tsx`:**

```typescript
initialData['maximum-application-lifetime'] = queue.maxApplicationLifetime || 0;
```

3. **Update `config-service.ts`:**

```typescript
'maximum-application-lifetime', // Add to knownProperties array
```

## Tips and Best Practices

1. **Use descriptive names:** Property keys should clearly indicate their purpose
2. **Provide helpful descriptions:** Users rely on descriptions to understand properties
3. **Set sensible defaults:** Choose defaults that work for most use cases
4. **Consider templates:** Mark properties as `availableInTemplate: true` if they should be available for auto-created queues
5. **Group related properties:** Keep related settings together for better UX
6. **Test edge cases:** Ensure validation handles empty values, extreme values, and invalid formats

## Troubleshooting

### Property not showing up?

- Check that the property is in the correct metadata file
- Verify the property group is included in the tab navigation
- Ensure there are no TypeScript compilation errors

### Validation not working?

- Check the property type is correct
- Verify custom validation logic in ConfigService
- Test with console.log to debug validation flow

### Value not saving?

- Ensure the property key matches between metadata and save handler
- Check that the property is included in the changes object
- Verify the onSave callback is properly connected

## Advanced Topics

### Dynamic Property Visibility

To show/hide properties based on other values:

```typescript
// In PropertyFormField or PropertyEditorModal
const isVisible = (property: ConfigProperty) => {
  // Example: Only show if legacy mode is disabled
  if (property.key === 'your-v2-only-property') {
    return !formData['legacy-mode-enabled'];
  }
  return true;
};

// In render:
{isVisible(property) && (
  <PropertyFormField ... />
)}
```

### Property Dependencies

To update related properties automatically:

```typescript
const handleFieldChange = (propertyKey: string, value: any) => {
    const newFormData = { ...formData, [propertyKey]: value };

    // Example: Update max when min changes
    if (propertyKey === 'minimum-capacity' && value > formData['maximum-capacity']) {
        newFormData['maximum-capacity'] = value;
    }

    setFormData(newFormData);
    setHasChanges(true);
    // ... validation ...
};
```

### Custom Property Categories

For entirely new categories, create a new metadata file:

1. Create `src/config/my-feature-metadata.ts`
2. Export metadata following the same pattern
3. Import in `src/config/index.ts`
4. Update ConfigService to include the new metadata

This system is designed to be extensible while maintaining consistency across all property types.
