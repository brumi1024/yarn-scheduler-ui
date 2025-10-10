# Plan for Validation System Re-architecture

## 1\. Project Goals & Philosophy

The primary goal is to replace the existing complex and inconsistent validation system with a **simple, centralized, and performant** solution. The new architecture will prioritize an excellent user experience by providing clear, immediate, and context-aware feedback.

**Core Principles:**

- **Simplicity Over Extensibility**: The system should be built for the known rules, not for hypothetical future complexity. Less code is better.
- **Declarative \> Imperative**: Rules should be defined as data, not as scattered imperative logic. This makes the system easier to understand and maintain.
- **Performance is a Feature**: Validation should be instantaneous and should only run when necessary. Re-validating the entire form on every change is not acceptable.
- **Clear User Feedback**: The user must always understand _what_ is wrong, _why_ it's wrong, and _where_ the error is. A clear distinction must be made between client-side input errors and server-side (YARN) rejection errors.
- **State Persistence**: The user's validation state should be preserved across UI interactions, such as closing and reopening the editor panel.

---

## 2\. Phase 1: Deconstruction & Cleanup

Before building the new system, we must safely dismantle the old one.

**Tasks:**

1.  **Inventory Existing Logic**:
    - Go through `src/hooks/useQueueValidation.ts`, `src/config/schemas/validation.ts`, and `src/utils/validation/` to document every existing validation rule.
    - Create a temporary markdown file to list each rule, its trigger, and its current error message. This ensures no logic is lost.
2.  **Remove Old Code**: Systematically remove the old files and hooks connected to the old validation system, and comment with a specific keyword (like VALIDATION_CALL) every place the old system was called - these need to be rechecked if the new system should be called from there.

---

## 3\. Phase 2: Core Engine Implementation

This phase involves creating the central pieces of the new architecture.

### 3.1. The Declarative Rule Engine

Create a new file: `src/config/validation-rules.ts`.

#### **Interfaces**

Define the core data structures for our engine.

```typescript
// src/config/validation-rules.ts

/**
 * Provides all necessary context for a validation function to execute.
 */
export interface ValidationContext {
  queueName: string; // The full path of the queue being validated, e.g., 'root.default'
  fieldName: string; // The property name that triggered the validation, e.g., 'capacity'
  fieldValue: any; // The new, pending value of the field
  allChanges: StagedChanges; // A snapshot of all currently staged changes
  fullQueueTree: SchedulerQueue; // The complete, original queue tree from the server
}

/**
 * Defines a single validation rule for the entire system.
 */
export interface ValidationRule {
  id: string; // A unique identifier, e.g., 'SUM_TO_100_PERCENT'
  description: string; // A human-readable description for debugging and documentation
  type: 'error' | 'warning'; // 'error' blocks saving, 'warning' is informational
  triggers: string[]; // An array of field names that will trigger this rule to run
  validator: (context: ValidationContext) => string | null; // Returns an error message string if invalid, otherwise null
}
```

#### **Rule Definitions**

Implement the business logic within this new structure.

```typescript
// src/config/validation-rules.ts

// Helper functions (e.g., getParentQueue, getSiblingsWithChanges) should be defined elsewhere.

export const QUEUE_VALIDATION_RULES: ValidationRule[] = [
  // Rule 1: 100% Capacity Rule
  {
    id: 'CAPACITY_SUM',
    description: 'Ensures child capacities sum correctly under a parent.',
    type: 'error',
    triggers: ['capacity'], // Only runs when 'capacity' is modified
    validator: ({ queueName, allChanges, fullQueueTree }) => {
      // ... logic to get parent, siblings, and check capacity mode ...
      // ... returns 'Sum of child queue capacities must be 100%.' or null ...
      return null;
    },
  },

  // Rule 2: Maximum Capacity Constraint
  {
    id: 'MAX_CAPACITY_CONSTRAINT',
    description: 'Ensures maximum-capacity is not less than capacity.',
    type: 'error',
    triggers: ['capacity', 'maximum-capacity'], // Runs if either field changes
    validator: ({ fieldValue, queueName, fieldName, allChanges }) => {
      // ... logic to get both capacity and max-capacity values ...
      // ... returns 'Maximum capacity cannot be less than capacity.' or null ...
      return null;
    },
  },

  // Rule 3: Capacity Mode Consistency
  {
    id: 'CONSISTENT_CAPACITY_MODE',
    description: 'Ensures all siblings use the same capacity mode.',
    type: 'error',
    triggers: ['capacity'], // Capacity is the field that defines the mode
    validator: (context) => {
      // ... logic to check capacity modes of all siblings ...
      // ... returns 'Inconsistent capacity mode under parent queue.' or null ...
      return null;
    },
  },

  // Rule 4: "Unrealistic Config" Warning
  {
    id: 'UNREALISTIC_CONFIG_WARNING',
    description: 'Checks if a value is outside a recommended range.',
    type: 'warning',
    triggers: getAllPropertyNames(), // This should be a list of all property names that can have a range warning
    validator: (context) => {
      // ... logic to get property descriptor and check range ...
      // ... returns the warning message from the descriptor or null ...
      return null;
    },
  },
];
```

### 3.2. State Management: `ValidationProvider` and `useValidation` Hook

Create a new file `src/contexts/ValidationContext.tsx` to manage the global validation state.

```typescript
// src/contexts/ValidationContext.tsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import { QUEUE_VALIDATION_RULES, ValidationContext as RuleContext } from '../config/validation-rules';
// Assume other necessary imports (Redux hooks to get state, etc.)

interface ValidationError {
  message: string;
  type: 'error' | 'warning';
}

type ValidationState = Record<string, Record<string, ValidationError>>; // { queueName: { fieldName: ValidationError } }

interface IValidationContext {
  errors: ValidationState;
  validateField: (queueName: string, fieldName: string, fieldValue: any) => void;
  clearAllErrors: () => void;
}

const ValidationContext = createContext<IValidationContext | null>(null);

export const ValidationProvider = ({ children }) => {
  const [errors, setErrors] = useState<ValidationState>({});

  // Use Redux selectors to get access to the necessary state
  const stagedChanges = useAppSelector(state => state.stagedChanges.changes);
  const queueTree = useAppSelector(state => state.schedulerData.queues);

  const validateField = useCallback((queueName: string, fieldName: string, fieldValue: any) => {
    const relevantRules = QUEUE_VALIDATION_RULES.filter(rule => rule.triggers.includes(fieldName));
    let fieldError: ValidationError | null = null;

    for (const rule of relevantRules) {
      const context: RuleContext = {
        queueName,
        fieldName,
        fieldValue,
        allChanges: stagedChanges,
        fullQueueTree: queueTree
      };

      const errorMessage = rule.validator(context);

      if (errorMessage) {
        fieldError = { message: errorMessage, type: rule.type };
        break; // Stop on the first error for this field
      }
    }

    setErrors(prevErrors => {
      const newErrors = JSON.parse(JSON.stringify(prevErrors)); // Deep copy to ensure immutability
      if (!newErrors[queueName]) newErrors[queueName] = {};

      if (fieldError) {
        newErrors[queueName][fieldName] = fieldError;
      } else {
        delete newErrors[queueName][fieldName];
        if (Object.keys(newErrors[queueName]).length === 0) {
          delete newErrors[queueName];
        }
      }
      return newErrors;
    });
  }, [stagedChanges, queueTree]);

  const clearAllErrors = () => setErrors({});

  return (
    <ValidationContext.Provider value={{ errors, validateField, clearAllErrors }}>
      {children}
    </ValidationContext.Provider>
  );
};

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};
```

Finally, wrap the main application layout in this provider, likely in `src/app/routes/layout.tsx`.

---

## 4\. Phase 3: UI/UX Integration

This phase connects the core engine to the React components.

### 4.1. Displaying Field-Level Errors and Warnings

Modify `src/features/property-editor/components/PropertyFormField.tsx` to use the new hook.

```tsx
// src/features/property-editor/components/PropertyFormField.tsx

import { useValidation } from '@/contexts/ValidationContext';
import { Field, FieldError } from '@/components/ui/field';

const PropertyFormField = ({ queueName, propertyName, ... }) => {
  const { errors, validateField } = useValidation();
  const validationResult = errors[queueName]?.[propertyName];

  const handleValueChange = (newValue) => {
    // 1. Update the staged changes via Redux dispatch
    // ...

    // 2. Trigger validation for the changed field
    validateField(queueName, propertyName, newValue);
  };

  return (
    <Field>
      {/* ... FieldLabel, Input component, etc. ... */}
      {validationResult && (
        <FieldError variant={validationResult.type}>
          {validationResult.message}
        </FieldError>
      )}
    </Field>
  );
};
```

### 4.2. Error Summary and Navigation

In `PropertyPanel.tsx`, create a new component to summarize errors.

1.  **Calculate Totals**: Use the `useValidation` hook to get the `errors` object and calculate the total number of errors and warnings.
2.  **Render Summary**: Display a component like `<ErrorSummary errors={errors} />`.
3.  **Implement Popover**: Inside `ErrorSummary`, use a `Popover` from `shadcn/ui`. The `PopoverTrigger` will be a badge showing the error count. The `PopoverContent` will list each error.
4.  **Enable Scrolling**: Each item in the error list will be a button. The `onClick` handler will find the DOM element for the corresponding input field (e.g., via a `data-field-id` attribute) and call `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.

---

## 5\. Phase 4: Advanced Features

### 5.1. Handling YARN Server-Side API Errors

This is a critical UX improvement to distinguish between front-end and back-end validation.

1.  **API Error State**: Add a new piece of state to the `stagedChangesSlice` in Redux.

    ```typescript
    // src/stores/slices/stagedChangesSlice.ts
    interface StagedChangesState {
      // ... other state
      apiError: string | null;
    }

    const initialState: StagedChangesState = {
      // ...
      apiError: null,
    };
    ```

2.  **Update on API Failure**: In the async thunk that handles saving changes, add a `rejected` case that updates this new state.
    ```typescript
    // In the createAsyncThunk for saving changes...
    .addCase(saveChanges.rejected, (state, action) => {
      state.apiError = action.error.message; // Store the error message from YARN
    })
    .addCase(saveChanges.fulfilled, (state) => {
      state.apiError = null; // Clear the error on success
    });
    ```
3.  **Display Persistent Alert**: In `StagedChangesPanel.tsx`, use a selector to read the `apiError` state. If it's not null, render a persistent `Alert` component.

    ```tsx
    // src/features/staged-changes/components/StagedChangesPanel.tsx
    const apiError = useAppSelector((state) => state.stagedChanges.apiError);

    return (
      <div>
        {apiError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Save Failed</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}
        {/* ... rest of the panel ... */}
      </div>
    );
    ```

4.  **Clearing the Error**: The error should also be cleared if the user modifies any value in the staged changes, indicating they are attempting to fix the issue.

### 5.2. "Unrealistic Configs" Warnings

This feature is handled by the `UNREALISTIC_CONFIG_WARNING` rule defined in Phase 2. The final step is to enrich the property descriptors.

1.  **Update Property Definitions**: Go to `src/config/properties/queue-properties.ts` and add the `warning` configuration to any relevant properties.
    ```typescript
    // Example for a memory property
    {
      name: 'yarn.scheduler.capacity.queue-a.capacity',
      // ...
      warning: {
        range: { min: 1024, max: 65536 },
        message: 'Values outside 1-64 GB are valid but may be unrealistic for this cluster.'
      }
    }
    ```

---

## 6\. Implementation Roadmap

A suggested order of operations to ensure a smooth transition.

1.  **Task 1: Setup**. Create the new files (`validation-rules.ts`, `ValidationContext.tsx`).
2.  **Task 2: Implement Core Engine**. Code the interfaces, the `ValidationProvider`, and the `useValidation` hook.
3.  **Task 3: Implement Rules**. Write the validator functions for the three core business rules (`CAPACITY_SUM`, `MAX_CAPACITY_CONSTRAINT`, `CONSISTENT_CAPACITY_MODE`).
4.  **Task 4: UI Integration**. Refactor `PropertyFormField.tsx` to use the new hook and display errors. At this point, basic client-side validation should be working.
5.  **Task 5: Warnings**. Implement the "unrealistic config" warning rule and update the property descriptors.
6.  **Task 6: Error Summary**. Build the error summary component with the popover and scroll-to-error functionality.
7.  **Task 7: YARN API Errors**. Implement the Redux state and `Alert` component for handling server-side rejections.
8.  **Task 8: Documentation**. Add a short section to the project's documentation explaining how to add a new validation rule.
