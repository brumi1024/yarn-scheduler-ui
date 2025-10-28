import React from 'react';
import type { Control, ControllerRenderProps, FormState, UseFormSetValue } from 'react-hook-form';
import { cn } from '~/utils/cn';
import { Input } from '~/components/ui/input';
import { FieldSwitch } from '~/components/ui/field-switch';
import { Badge } from '~/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { FormField } from '~/components/ui/form';
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
} from '~/components/ui/field';
import { Info, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useCapacityEditor } from '~/features/queue-management/hooks/useCapacityEditor';
import type { PropertyDescriptor } from '~/types/property-descriptor';

interface PropertyFormFieldProps {
  property: PropertyDescriptor;
  control: Control<Record<string, string>>;
  stagedStatus?: 'new' | 'modified' | 'deleted';
  isEnabled?: boolean;
  onBlur?: (
    propertyName: string,
    value: string,
    options?: {
      validationOverrides?: Array<{ queuePath: string; field: string; value: string }>;
    },
  ) => void;
  errors?: string[];
  warnings?: string[];
  queuePath?: string;
  queueName?: string;
  parentQueuePath?: string;
  currentValues?: Partial<Record<string, string>>;
  setFormValue?: UseFormSetValue<Record<string, string>>;
}

export const PropertyFormField: React.FC<PropertyFormFieldProps> = ({
  property,
  control,
  stagedStatus,
  isEnabled = true,
  onBlur,
  errors = [],
  warnings = [],
  queuePath,
  queueName,
  parentQueuePath,
  currentValues,
}) => {
  const { openCapacityEditor } = useCapacityEditor();

  // Render different input types based on property type
  const renderInput = (
    field: ControllerRenderProps<Record<string, string>, string>,
    formState: FormState<Record<string, string>>,
  ): React.ReactElement => {
    const fieldName = property.formFieldName || property.name;
    const error = formState.errors?.[fieldName];
    const hasFormError = Boolean(error);
    const fieldErrors = errors
      .map((message) => (typeof message === 'string' ? message.trim() : ''))
      .filter((message) => message.length > 0);
    const inlineBusinessError = hasFormError ? undefined : fieldErrors[0];
    const remainingBusinessErrors = hasFormError
      ? fieldErrors
      : inlineBusinessError
        ? fieldErrors.slice(1)
        : [];
    const renderBusinessErrorsList = (messages: string[]) =>
      messages.length > 0 ? (
        <div className="mt-1 space-y-1">
          {messages.map((message, index) => (
            <div key={`business-error-${fieldName}-${index}`} className="text-xs text-destructive">
              {message}
            </div>
          ))}
        </div>
      ) : null;

    const commonProps = {
      disabled: !isEnabled,
      className: cn(
        stagedStatus === 'modified' && 'ring-2 ring-primary ring-offset-1',
        error && 'ring-2 ring-destructive ring-offset-1',
      ),
    };

    switch (property.type) {
      case 'boolean':
        return (
          <>
            <FieldSwitch
              id={fieldName}
              fieldName={fieldName}
              label={`${property.displayName}${property.required ? ' *' : ''}`}
              labelSuffix={
                stagedStatus === 'modified' ? (
                  <Badge variant="default" className="text-xs h-4 px-1 shrink-0">
                    Staged
                  </Badge>
                ) : null
              }
              description={property.description}
              labelProps={{
                className: cn(!isEnabled && 'text-muted-foreground'),
              }}
              disabled={!isEnabled}
              checked={field.value === 'true'}
              onCheckedChange={(checked) => {
                const nextValue = checked ? 'true' : '';
                field.onChange(nextValue);
                onBlur?.(property.name, nextValue);
              }}
              switchClassName={commonProps.className}
              message={
                error
                  ? String(error.message ?? '')
                  : inlineBusinessError
                    ? inlineBusinessError
                    : undefined
              }
            />
            {renderBusinessErrorsList(remainingBusinessErrors)}
          </>
        );

      case 'enum': {
        const enumOptions = property.enumValues ?? [];

        if (!enumOptions.length) {
          return (
            <Field>
              <FieldLabel>{property.displayName}</FieldLabel>
              <FieldDescription className="text-xs text-muted-foreground">
                No options available.
              </FieldDescription>
            </Field>
          );
        }

        const renderChoiceCards = () => (
          <Field>
            <FieldLabel
              className={cn('flex items-center gap-1', !isEnabled && 'text-muted-foreground')}
            >
              <span className="truncate">
                {property.displayName}
                {property.required ? ' *' : ''}
              </span>
              {stagedStatus === 'modified' && (
                <Badge variant="default" className="text-xs h-4 px-1 shrink-0">
                  Staged
                </Badge>
              )}
            </FieldLabel>
            <FieldControl>
              <div className="grid gap-3 sm:grid-cols-2">
                {enumOptions.map((option) => {
                  const isSelected = field.value === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition',
                        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                        isSelected
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border hover:border-primary/60',
                        !isEnabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={fieldName}
                          value={option.value}
                          checked={isSelected}
                          onChange={() => {
                            field.onChange(option.value);
                            onBlur?.(property.name, option.value);
                          }}
                          disabled={!isEnabled}
                          className="mt-0.5 h-4 w-4 rounded-full border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-none">{option.label}</span>
                            {isSelected && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Selected
                              </Badge>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </FieldControl>
            {property.description && (
              <FieldDescription className="text-xs text-muted-foreground">
                {property.description}
              </FieldDescription>
            )}
            {(error || inlineBusinessError) && (
              <FieldMessage>
                {error ? String(error.message ?? '') : inlineBusinessError}
              </FieldMessage>
            )}
            {renderBusinessErrorsList(remainingBusinessErrors)}
          </Field>
        );

        const renderToggleGroup = () => (
          <Field>
            <FieldLabel
              className={cn('flex items-center gap-1', !isEnabled && 'text-muted-foreground')}
            >
              <span className="truncate">
                {property.displayName}
                {property.required ? ' *' : ''}
              </span>
              {stagedStatus === 'modified' && (
                <Badge variant="default" className="text-xs h-4 px-1 shrink-0">
                  Staged
                </Badge>
              )}
            </FieldLabel>
            <FieldControl>
              <ToggleGroup
                type="single"
                value={field.value || ''}
                onValueChange={(value) => {
                  if (value) {
                    field.onChange(value);
                    onBlur?.(property.name, value);
                  }
                }}
                disabled={!isEnabled}
                className="justify-start flex-wrap"
                variant="outline"
              >
                {enumOptions.map((option) => (
                  <ToggleGroupItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldControl>
            {property.description && (
              <FieldDescription className="text-xs text-muted-foreground">
                {property.description}
              </FieldDescription>
            )}
            {(error || inlineBusinessError) && (
              <FieldMessage>
                {error ? String(error.message ?? '') : inlineBusinessError}
              </FieldMessage>
            )}
            {renderBusinessErrorsList(remainingBusinessErrors)}
          </Field>
        );

        if (property.enumDisplay === 'choiceCard') {
          return renderChoiceCards();
        }
        return renderToggleGroup();
      }

      case 'number':
        return (
          <Field>
            <FieldLabel
              className={cn('flex items-center gap-1', !isEnabled && 'text-muted-foreground')}
            >
              <span className="truncate">
                {property.displayName}
                {property.required ? ' *' : ''}
              </span>
              {stagedStatus === 'modified' && (
                <Badge variant="default" className="text-xs h-4 px-1 shrink-0">
                  Staged
                </Badge>
              )}
            </FieldLabel>
            <FieldControl>
              <div className="relative">
                <Input
                  type="number"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={(e) => {
                    field.onBlur();
                    onBlur?.(property.name, e.target.value);
                  }}
                  step={property.displayFormat?.decimals ? 0.01 : 1}
                  min={property.validationRules?.find((r) => r.type === 'range')?.min}
                  max={property.validationRules?.find((r) => r.type === 'range')?.max}
                  disabled={!isEnabled}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    stagedStatus === 'modified' && 'ring-2 ring-primary ring-offset-1',
                    error && 'ring-2 ring-destructive ring-offset-1',
                  )}
                />
                {property.displayFormat?.suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {property.displayFormat.suffix}
                  </span>
                )}
              </div>
            </FieldControl>
            {property.description && (
              <FieldDescription className="text-xs text-muted-foreground">
                {property.description}
              </FieldDescription>
            )}
            {(error || inlineBusinessError) && (
              <FieldMessage>
                {error ? String(error.message ?? '') : inlineBusinessError}
              </FieldMessage>
            )}
            {renderBusinessErrorsList(remainingBusinessErrors)}
          </Field>
        );

      default: {
        // string, capacity, and ACL fields
        const fieldValue = typeof field.value === 'string' ? field.value : '';
        const isCapacityField = property.name === 'capacity';
        const isMaxCapacityField = property.name === 'maximum-capacity';
        const capacityFieldValue = isCapacityField
          ? fieldValue
          : (currentValues?.['capacity'] ?? '');
        const maxCapacityFieldValue = isMaxCapacityField
          ? fieldValue
          : (currentValues?.['maximum-capacity'] ?? '');

        const handleOpenCapacityEditor = () => {
          if (!parentQueuePath || !queuePath) {
            return;
          }

          const safeQueueName =
            queueName ?? queuePath?.split('.').pop() ?? parentQueuePath.split('.').pop() ?? 'Queue';

          openCapacityEditor({
            origin: 'property-editor',
            parentQueuePath,
            originQueuePath: queuePath,
            originQueueName: safeQueueName,
            capacityValue: capacityFieldValue,
            maxCapacityValue: maxCapacityFieldValue,
          });
        };

        if (isCapacityField || isMaxCapacityField) {
          const displayValue =
            (isCapacityField ? capacityFieldValue : maxCapacityFieldValue) || 'Not set';

          return (
            <Field>
              <FieldLabel
                className={cn(
                  'flex flex-wrap items-center gap-2',
                  !isEnabled && 'text-muted-foreground',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="truncate">
                    {property.displayName}
                    {property.required ? ' *' : ''}
                  </span>
                  {stagedStatus === 'modified' && (
                    <Badge variant="default" className="text-xs h-4 px-1 shrink-0">
                      Staged
                    </Badge>
                  )}
                </div>

                <div className="ml-auto flex-shrink-0">
                  {isCapacityField ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={handleOpenCapacityEditor}
                      disabled={!parentQueuePath || !isEnabled}
                    >
                      Capacity Editor
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Managed in Capacity Editor
                    </span>
                  )}
                </div>
              </FieldLabel>
              <div className="mt-2 w-full break-all rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm font-mono text-foreground">
                {displayValue}
              </div>
              {property.description && !(isCapacityField || isMaxCapacityField) && (
                <FieldDescription className="text-xs text-muted-foreground">
                  {property.description}
                </FieldDescription>
              )}
              {(error || inlineBusinessError) && (
                <FieldMessage>
                  {error ? String(error.message ?? '') : inlineBusinessError}
                </FieldMessage>
              )}
              {renderBusinessErrorsList(remainingBusinessErrors)}
              {warnings.length > 0 && (
                <div className="mt-1 space-y-1">
                  {warnings.map((warning, index) => {
                    const isLegacyMode = warning.includes('legacy mode requirement');
                    return (
                      <div key={index} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-600 dark:text-yellow-500">{warning}</p>
                        {isLegacyMode && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help mt-0.5 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                This validation is enforced because legacy queue mode is enabled.
                                You can disable legacy mode in Global Settings for more flexible
                                capacity configuration.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Field>
          );
        }

        return (
          <Field>
            <FieldLabel
              className={cn(
                'flex items-center gap-2 justify-between',
                !isEnabled && 'text-muted-foreground',
              )}
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className="truncate">
                  {property.displayName}
                  {property.required ? ' *' : ''}
                </span>
                {stagedStatus === 'modified' && (
                  <Badge variant="default" className="text-xs h-4 px-1 shrink-0">
                    Staged
                  </Badge>
                )}
              </div>
            </FieldLabel>
            <FieldControl>
              {property.name.includes('acl') ? (
                <textarea
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={(e) => {
                    field.onBlur();
                    onBlur?.(property.name, e.target.value);
                  }}
                  rows={2}
                  placeholder={property.defaultValue || undefined}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    commonProps.className,
                  )}
                  disabled={!isEnabled}
                  aria-invalid={Boolean(error)}
                />
              ) : (
                <Input
                  type="text"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={(e) => {
                    field.onBlur();
                    onBlur?.(property.name, e.target.value);
                  }}
                  placeholder={property.defaultValue || undefined}
                  disabled={!isEnabled}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    stagedStatus === 'modified' && 'ring-2 ring-primary ring-offset-1',
                    error && 'ring-2 ring-destructive ring-offset-1',
                  )}
                />
              )}
            </FieldControl>
            {property.description && (
              <FieldDescription className="text-xs text-muted-foreground">
                {property.description}
              </FieldDescription>
            )}
            {(error || inlineBusinessError) && (
              <FieldMessage>
                {error ? String(error.message ?? '') : inlineBusinessError}
              </FieldMessage>
            )}
            {renderBusinessErrorsList(remainingBusinessErrors)}
            {warnings.length > 0 && (
              <div className="mt-1 space-y-1">
                {warnings.map((warning, index) => {
                  const isLegacyMode = warning.includes('legacy mode requirement');
                  return (
                    <div key={index} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-600 dark:text-yellow-500">{warning}</p>
                      {isLegacyMode && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help mt-0.5 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                              This validation is enforced because legacy queue mode is enabled. You
                              can disable legacy mode in Global Settings for more flexible capacity
                              configuration.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Field>
        );
      }
    }
  };

  return (
    <TooltipProvider>
      <FormField
        control={control}
        name={property.formFieldName || property.name}
        render={({ field, formState }) => (
          <div className="space-y-1" data-field-id={property.originalName || property.name}>
            {renderInput(field, formState)}

            {/* Status badges and helper text */}
            {(property.deprecated || property.deprecationMessage || !isEnabled) && (
              <div className="flex items-center flex-wrap gap-1 mt-2">
                {property.deprecated && (
                  <Badge
                    variant="outline"
                    className="text-xs h-5 border-orange-500 text-orange-500"
                  >
                    Deprecated
                  </Badge>
                )}
                {property.deprecated && property.deprecationMessage && (
                  <span className="text-xs text-orange-500">{property.deprecationMessage}</span>
                )}
                {!isEnabled && (
                  <span className="text-xs text-muted-foreground">
                    This field is disabled based on current configuration
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      />
    </TooltipProvider>
  );
};
