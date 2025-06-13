# Adding New Properties to the YARN Scheduler UI

This guide explains how to add new properties to the simplified configuration system in the YARN Scheduler UI. The new system uses direct TypeScript definitions instead of complex metadata abstractions.

## Overview

The simplified property system consists of:

- **Property definitions** in `src/config/property-definitions.ts` that define property schemas
- **Simple validation functions** in `src/config/property-validation.ts`
- **Configuration API** in `src/config/simple-config.ts` that provides access to properties
- **PropertyEditorModal** that generates forms dynamically
- **PropertyFormField** that renders appropriate input controls

## Step-by-Step Guide

### Step 1: Determine Property Category

First, decide where your property belongs:

- **Queue-specific properties** → Add to `QUEUE_PROPERTIES` in `property-definitions.ts`
- **Global scheduler settings** → Add to `GLOBAL_PROPERTIES` in `property-definitions.ts`
- **Auto-creation properties** → Add to `AUTO_CREATION_PROPERTIES` in `property-definitions.ts`
- **Node label properties** → Add to `NODE_LABEL_PROPERTIES` in `property-definitions.ts`

### Step 2: Define the Property

#### For Queue Properties (Most Common)

Edit `src/config/property-definitions.ts` and add your property to the appropriate group in `QUEUE_PROPERTIES`:

```typescript
// Find the appropriate group or create a new one
{
    groupName: 'Resource Limits & Management',
    properties: [
        // ... existing properties ...
        {
            key: 'maximum-apps',
            displayName: 'Maximum Applications',
            description: 'Maximum number of applications that can be active or pending in this queue',
            type: 'number',
            placeholder: 'No limit (unlimited)',
        },
    ],
},
```

#### Property Type Examples

**String Property:**

```typescript
{
    key: 'queue-description',
    displayName: 'Queue Description',
    description: 'A text description of this queue\'s purpose',
    type: 'string',
    defaultValue: '',
    placeholder: 'Enter queue description',
}
```

**Number Property:**

```typescript
{
    key: 'minimum-allocation-mb',
    displayName: 'Minimum Allocation (MB)',
    description: 'Minimum memory allocation per container in MB',
    type: 'number',
    defaultValue: 1024,
    placeholder: 'Default: 1024',
    step: '512', // Optional: step increment for number input
}
```

**Boolean Property:**

```typescript
{
    key: 'enable-size-based-weight',
    displayName: 'Enable Size-Based Weight',
    description: 'Whether to enable size-based weight for resource allocation',
    type: 'boolean',
    defaultValue: false,
}
```

**Enum Property:**

```typescript
{
    key: 'queue-priority',
    displayName: 'Queue Priority',
    description: 'Priority level for this queue',
    type: 'enum',
    options: ['HIGH', 'NORMAL', 'LOW'],
    defaultValue: 'NORMAL',
}
```

**Percentage Property:**

```typescript
{
    key: 'guaranteed-allocation',
    displayName: 'Guaranteed Allocation',
    description: 'Guaranteed resource allocation as a percentage (0.0 to 1.0)',
    type: 'percentage',
    defaultValue: 0.5,
    placeholder: 'Default: 0.5 (50%)',
}
```

#### For Global Properties

Add to `GLOBAL_PROPERTIES` in the appropriate group:

```typescript
{
    groupName: 'Global Application Management',
    properties: [
        // ... existing properties ...
        {
            key: 'maximum-apps',
            displayName: 'Maximum Applications (Global)',
            description: 'Total number of applications that can be active or pending in the cluster',
            type: 'number',
            defaultValue: 10000,
        },
    ],
},
```

### Step 3: Add Property Groups (If Needed)

If your property doesn't fit existing groups, create a new one:

```typescript
export const QUEUE_PROPERTIES: PropertyGroup[] = [
    // ... existing groups ...
    {
        groupName: 'Custom Feature Settings',
        properties: [
            {
                key: 'custom-feature-enabled',
                displayName: 'Enable Custom Feature',
                description: 'Enables the custom feature for this queue',
                type: 'boolean',
                defaultValue: false,
            },
            // Add more related properties here
        ],
    },
];
```

### Step 4: Add Custom Validation (If Needed)

If your property requires custom validation beyond the standard type validation, update `src/config/property-validation.ts`:

```typescript
export function validateProperty(key: string, value: any): ValidationResult {
    // Add custom validation for your property
    if (key === 'your-new-property') {
        // Custom validation logic
        if (value && !value.match(/^[A-Z]+$/)) {
            return { valid: false, error: 'Must contain only uppercase letters' };
        }
    }

    // ... existing validation code ...
    return validateByType(type, value);
}
```

### Step 5: Update Component Data Mapping (If Needed)

Update the data mapping in component files to show current values. For queue properties, this is typically in `PropertyEditorModal.tsx`:

```typescript
useEffect(() => {
    if (queue && open) {
        const initialData: Record<string, any> = {};

        // ... existing mappings ...

        // Add mapping for your new property
        initialData['your-new-property'] = queue.yourNewProperty || getDefaultValue('your-new-property');

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

### Step 8: How the System Handles Queue vs Global Properties

The simplified system automatically handles the distinction between queue-level and global properties:

#### Queue-Level Properties
When used with a queue context, the system generates YARN property keys like:
```typescript
buildYarnPropertyKey('root.production', 'maximum-apps')
// Results in: "yarn.scheduler.capacity.root.production.maximum-apps"
```

#### Global Properties
When used without a queue context, the system generates global YARN property keys like:
```typescript
buildYarnPropertyKey('', 'maximum-apps')
// Results in: "yarn.scheduler.capacity.maximum-apps"
```

The UI components automatically:
- Show queue-level properties when editing a queue
- Show global properties when editing global settings
- Handle property key construction based on context

## Example: Adding a Complete Property

Let's add a "maximum-application-lifetime" property with both queue and global variants:

1. **Edit `src/config/property-definitions.ts`:**

```typescript
// Add to QUEUE_PROPERTIES
{
    groupName: 'Resource Limits & Management',
    properties: [
        // ... existing properties ...
        {
            key: 'maximum-application-lifetime',
            displayName: 'Maximum Application Lifetime',
            description: 'Maximum lifetime of an application in seconds (0 for unlimited)',
            type: 'number',
            defaultValue: 0,
            placeholder: 'Default: 0 (unlimited)',
            step: '3600', // 1 hour increments
        },
    ],
},

// Add to GLOBAL_PROPERTIES
{
    groupName: 'Global Application Management',
    properties: [
        // ... existing properties ...
        {
            key: 'maximum-application-lifetime',
            displayName: 'Maximum Application Lifetime (Global)',
            description: 'Global maximum lifetime of applications in seconds (0 for unlimited)',
            type: 'number',
            defaultValue: 0,
            placeholder: 'Default: 0 (unlimited)',
            step: '3600',
        },
    ],
},
```

2. **Update component mapping (if needed):**

```typescript
// In PropertyEditorModal.tsx
initialData['maximum-application-lifetime'] = queue.maxApplicationLifetime || getDefaultValue('maximum-application-lifetime');
```

## Key Differences from the Old System

### Before (Complex Metadata System)
```typescript
// Complex metadata with placeholder substitution
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.maximum-apps`]: {
    key: 'maximum-apps',
    displayName: 'Maximum Applications',
    // ... complex metadata structure
}

// Usage required ConfigService singleton
const configService = ConfigService.getInstance();
const property = configService.getPropertyDefinition(key);
```

### After (Simplified System)
```typescript
// Direct property definition
{
    key: 'maximum-apps',
    displayName: 'Maximum Applications',
    description: 'Maximum number of applications...',
    type: 'number',
    // ... simple, direct structure
}

// Usage with simple functions
import { getPropertyDefinition, buildYarnPropertyKey } from '../config/simple-config';
const property = getPropertyDefinition(key);
const yarnKey = buildYarnPropertyKey(queuePath, key);
```

## Tips and Best Practices

1. **Use descriptive names:** Property keys should clearly indicate their purpose
2. **Provide helpful descriptions:** Users rely on descriptions to understand properties
3. **Set sensible defaults:** Choose defaults that work for most use cases
4. **Group related properties:** Keep related settings together for better UX
5. **Test edge cases:** Ensure validation handles empty values, extreme values, and invalid formats
6. **Follow the simplified approach:** Don't add unnecessary abstractions

## Troubleshooting

### Property not showing up?

- Check that the property is in the correct array (`QUEUE_PROPERTIES`, `GLOBAL_PROPERTIES`, etc.)
- Verify there are no TypeScript compilation errors
- Ensure the property group is included in the component that renders it

### Validation not working?

- Check the property type is correct
- Verify custom validation logic in `property-validation.ts`
- Test with console.log to debug validation flow

### Value not saving?

- Ensure the property key matches between definitions and save handler
- Check that the property is included in the form data
- Verify the onSave callback is properly connected

## Advanced Topics

### Dynamic Property Visibility

To show/hide properties based on other values:

```typescript
// In PropertyFormField or PropertyEditorModal
const isVisible = (property: PropertyDefinition) => {
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

The simplified system makes it much easier to add new properties while maintaining type safety and clear code structure.