import React from 'react';
import { Input } from '~/components/ui/input';
import { FieldSwitch } from '~/components/ui/field-switch';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
} from '~/components/ui/field';
import { cn } from '~/utils/cn';
import type { PropertyDescriptor } from '~/types/property-descriptor';
import { HighlightedText } from '~/components/search/HighlightedText';
import { useValidation } from '~/contexts/ValidationContext';
import { SPECIAL_VALUES } from '~/types';

interface PropertyInputProps {
  property: PropertyDescriptor;
  value: string;
  isStaged: boolean;
  onChange: (value: string) => void;
  searchQuery?: string;
}

export const PropertyInput: React.FC<PropertyInputProps> = ({
  property,
  value,
  isStaged,
  onChange,
  searchQuery,
}) => {
  // Extract validation rules for min/max
  const rangeValidation = property.validationRules?.find((rule) => rule.type === 'range');
  const { errors } = useValidation();

  const queueIssues = errors[SPECIAL_VALUES.GLOBAL_QUEUE_PATH] ?? {};
  const fieldIssues = queueIssues[property.name] ?? [];
  const errorMessages = fieldIssues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => issue.message);
  const warningMessages = fieldIssues
    .filter((issue) => issue.severity === 'warning')
    .map((issue) => issue.message);
  const errorMessage = errorMessages.join(' ');
  const warningMessage = warningMessages.join(' ');

  const renderInput = () => {
    const labelNode = searchQuery ? (
      <HighlightedText text={property.displayName} highlight={searchQuery} />
    ) : (
      property.displayName
    );

    const descriptionNode = searchQuery ? (
      <HighlightedText text={property.description || ''} highlight={searchQuery} />
    ) : (
      property.description
    );

    const stagedBadge = isStaged && (
      <Badge variant="outline" className="border-warning text-warning">
        Modified
      </Badge>
    );

    const propertyDescription = descriptionNode ? (
      <FieldDescription className="text-sm text-muted-foreground">
        {descriptionNode}
      </FieldDescription>
    ) : null;

    const warningDescription = warningMessage ? (
      <FieldDescription className="text-sm text-amber-600">{warningMessage}</FieldDescription>
    ) : null;

    const errorMessageNode = errorMessage ? <FieldMessage>{errorMessage}</FieldMessage> : null;

    switch (property.type) {
      case 'boolean':
        return (
          <FieldSwitch
            id={property.name}
            label={labelNode}
            description={
              descriptionNode || warningMessage ? (
                <>
                  {descriptionNode ? <span className="block">{descriptionNode}</span> : null}
                  {warningMessage ? (
                    <span className="block text-amber-600 mt-1">{warningMessage}</span>
                  ) : null}
                </>
              ) : null
            }
            addon={stagedBadge}
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
            message={errorMessage || undefined}
          />
        );

      case 'enum': {
        const enumOptions = property.enumValues ?? [];

        if (property.enumDisplay === 'choiceCard' && enumOptions.length > 0) {
          const currentValue = value || property.defaultValue || '';

          return (
            <Field className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={property.name}>{labelNode}</FieldLabel>
                {stagedBadge}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {enumOptions.map((option) => {
                  const isSelected = currentValue === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition',
                        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                        isSelected
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border hover:border-primary/60',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name={property.name}
                          value={option.value}
                          checked={isSelected}
                          onChange={() => onChange(option.value)}
                          className="mt-0.5 h-4 w-4 rounded-full border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-none">{option.label}</span>
                            {isSelected && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Selected
                              </Badge>
                            )}
                          </div>
                          {option.description && (
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {propertyDescription}
              {warningDescription}
              {errorMessageNode}
            </Field>
          );
        }

        return (
          <Field className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={property.name}>{labelNode}</FieldLabel>
              {stagedBadge}
            </div>
            <Select value={value || property.defaultValue || ''} onValueChange={onChange}>
              <FieldControl>
                <SelectTrigger id={property.name}>
                  <SelectValue />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {property.enumValues?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col gap-1 text-left">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {propertyDescription}
            {warningDescription}
            {errorMessageNode}
          </Field>
        );
      }

      case 'number':
        return (
          <Field className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={property.name}>{labelNode}</FieldLabel>
              {stagedBadge}
            </div>
            <FieldControl>
              <Input
                id={property.name}
                type="number"
                value={value || property.defaultValue || ''}
                onChange={(e) => onChange(e.target.value)}
                min={rangeValidation?.min}
                max={rangeValidation?.max}
              />
            </FieldControl>
            {propertyDescription}
            {warningDescription}
            {errorMessageNode}
          </Field>
        );

      case 'string':
      default:
        return (
          <Field className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={property.name}>{labelNode}</FieldLabel>
              {stagedBadge}
            </div>
            <FieldControl>
              <Input
                id={property.name}
                type="text"
                value={value || property.defaultValue || ''}
                onChange={(e) => onChange(e.target.value)}
              />
            </FieldControl>
            {propertyDescription}
            {warningDescription}
            {errorMessageNode}
          </Field>
        );
    }
  };

  return <div className="w-full">{renderInput()}</div>;
};
