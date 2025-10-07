import React from 'react';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Field, FieldControl, FieldDescription, FieldLabel } from '~/components/ui/field';
import type { PropertyDescriptor } from '~/types/property-descriptor';
import { HighlightedText } from '~/components/search/HighlightedText';

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

    switch (property.type) {
      case 'boolean':
        return (
          <Field className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <FieldLabel htmlFor={property.name} className="text-base">
                {labelNode}
              </FieldLabel>
              {descriptionNode && (
                <FieldDescription className="text-sm text-muted-foreground">
                  {descriptionNode}
                </FieldDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {stagedBadge}
              <FieldControl>
                <Switch
                  id={property.name}
                  checked={value === 'true'}
                  onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
                />
              </FieldControl>
            </div>
          </Field>
        );

      case 'enum':
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
                {property.enumValues?.map((enumValue) => (
                  <SelectItem key={enumValue} value={enumValue}>
                    {enumValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {descriptionNode && (
              <FieldDescription className="text-sm text-muted-foreground">
                {descriptionNode}
              </FieldDescription>
            )}
          </Field>
        );

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
            {descriptionNode && (
              <FieldDescription className="text-sm text-muted-foreground">
                {descriptionNode}
              </FieldDescription>
            )}
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
            {descriptionNode && (
              <FieldDescription className="text-sm text-muted-foreground">
                {descriptionNode}
              </FieldDescription>
            )}
          </Field>
        );
    }
  };

  return <div className="w-full">{renderInput()}</div>;
};
