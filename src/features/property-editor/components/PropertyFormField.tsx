import React from 'react';
import type { Control, ControllerRenderProps, FormState } from 'react-hook-form';
import { cn } from '~/utils/cn';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import { Badge } from '~/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '~/components/ui/form';
import { HelpCircle } from 'lucide-react';
import type { PropertyDescriptor } from '~/types/property-descriptor';

interface PropertyFormFieldProps {
  property: PropertyDescriptor;
  control: Control<Record<string, string>>;
  stagedStatus?: 'new' | 'modified' | 'deleted';
  dependentValues?: Record<string, string>;
}

export const PropertyFormField: React.FC<PropertyFormFieldProps> = ({
  property,
  control,
  stagedStatus,
  dependentValues = {},
}) => {
  // Check if field should be enabled based on dependencies
  const isFieldEnabled = React.useMemo(() => {
    if (!property.enableWhen) return true;

    return Object.entries(property.enableWhen).every(([dependentField, condition]) => {
      const dependentValue = dependentValues[dependentField];
      return condition(dependentValue || '');
    });
  }, [property.enableWhen, dependentValues]);

  // Render different input types based on property type
  const renderInput = (
    field: ControllerRenderProps<Record<string, string>, string>,
    formState: FormState<Record<string, string>>,
  ): React.ReactElement => {
    const fieldName = property.formFieldName || property.name;
    const error = formState.errors?.[fieldName];

    const commonProps = {
      disabled: !isFieldEnabled,
      className: cn(
        stagedStatus === 'modified' && 'ring-2 ring-primary ring-offset-1',
        error && 'ring-2 ring-destructive ring-offset-1',
      ),
    };

    switch (property.type) {
      case 'boolean':
        return (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5 flex-1 min-w-0">
              <FormLabel
                className={cn(
                  'flex items-center gap-1',
                  !isFieldEnabled && 'text-muted-foreground',
                )}
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
                {property.description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{property.description}</TooltipContent>
                  </Tooltip>
                )}
              </FormLabel>
            </div>
            <FormControl>
              <Switch
                checked={field.value === 'true'}
                onCheckedChange={(checked) => field.onChange(checked ? 'true' : '')}
                disabled={!isFieldEnabled}
              />
            </FormControl>
          </FormItem>
        );

      case 'enum':
        return (
          <FormItem>
            <FormLabel
              className={cn('flex items-center gap-1', !isFieldEnabled && 'text-muted-foreground')}
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
              {property.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{property.description}</TooltipContent>
                </Tooltip>
              )}
            </FormLabel>
            <FormControl>
              <ToggleGroup
                type="single"
                value={field.value || ''}
                onValueChange={(value) => {
                  // Prevent deselection - keep current value if empty
                  if (value) {
                    field.onChange(value);
                  }
                }}
                disabled={!isFieldEnabled}
                className="justify-start flex-wrap"
                variant="outline"
              >
                {property.enumValues?.map((option) => (
                  <ToggleGroupItem key={option} value={option} className="text-xs">
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'number':
        return (
          <FormItem>
            <FormLabel
              className={cn('flex items-center gap-1', !isFieldEnabled && 'text-muted-foreground')}
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
              {property.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{property.description}</TooltipContent>
                </Tooltip>
              )}
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={property.displayFormat?.decimals ? 0.01 : 1}
                  min={property.validationRules?.find((r) => r.type === 'range')?.min}
                  max={property.validationRules?.find((r) => r.type === 'range')?.max}
                  disabled={!isFieldEnabled}
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
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      default: // string and capacity types
        return (
          <FormItem>
            <FormLabel
              className={cn('flex items-center gap-1', !isFieldEnabled && 'text-muted-foreground')}
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
              {property.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{property.description}</TooltipContent>
                </Tooltip>
              )}
            </FormLabel>
            <FormControl>
              {property.name.includes('acl') ? (
                <textarea
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  rows={2}
                  placeholder={property.defaultValue || undefined}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    commonProps.className,
                  )}
                  disabled={!isFieldEnabled}
                />
              ) : (
                <Input
                  type="text"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  placeholder={property.defaultValue || undefined}
                  disabled={!isFieldEnabled}
                  className={cn(
                    stagedStatus === 'modified' && 'ring-2 ring-primary ring-offset-1',
                    error && 'ring-2 ring-destructive ring-offset-1',
                  )}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        );
    }
  };

  return (
    <TooltipProvider>
      <FormField
        control={control}
        name={property.formFieldName || property.name}
        render={({ field, formState }) => (
          <div className="space-y-1">
            {renderInput(field, formState)}

            {/* Status badges and helper text */}
            {(property.deprecated || property.deprecationMessage || !isFieldEnabled) && (
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
                {!isFieldEnabled && (
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
