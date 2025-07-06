import React from 'react';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
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
    switch (property.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor={property.name} className="text-base">
                {searchQuery ? (
                  <HighlightedText text={property.displayName} highlight={searchQuery} />
                ) : (
                  property.displayName
                )}
              </Label>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? (
                  <HighlightedText text={property.description || ''} highlight={searchQuery} />
                ) : (
                  property.description
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isStaged && (
                <Badge variant="outline" className="border-warning text-warning">
                  Modified
                </Badge>
              )}
              <Switch
                id={property.name}
                checked={value === 'true'}
                onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
              />
            </div>
          </div>
        );

      case 'enum':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={property.name}>
                {searchQuery ? (
                  <HighlightedText text={property.displayName} highlight={searchQuery} />
                ) : (
                  property.displayName
                )}
              </Label>
              {isStaged && (
                <Badge variant="outline" className="border-warning text-warning">
                  Modified
                </Badge>
              )}
            </div>
            <Select value={value || property.defaultValue || ''} onValueChange={onChange}>
              <SelectTrigger id={property.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {property.enumValues?.map((enumValue) => (
                  <SelectItem key={enumValue} value={enumValue}>
                    {enumValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? (
                <HighlightedText text={property.description || ''} highlight={searchQuery} />
              ) : (
                property.description
              )}
            </p>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={property.name}>
                {searchQuery ? (
                  <HighlightedText text={property.displayName} highlight={searchQuery} />
                ) : (
                  property.displayName
                )}
              </Label>
              {isStaged && (
                <Badge variant="outline" className="border-warning text-warning">
                  Modified
                </Badge>
              )}
            </div>
            <Input
              id={property.name}
              type="number"
              value={value || property.defaultValue || ''}
              onChange={(e) => onChange(e.target.value)}
              min={rangeValidation?.min}
              max={rangeValidation?.max}
            />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? (
                <HighlightedText text={property.description || ''} highlight={searchQuery} />
              ) : (
                property.description
              )}
            </p>
          </div>
        );

      case 'string':
      default:
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={property.name}>
                {searchQuery ? (
                  <HighlightedText text={property.displayName} highlight={searchQuery} />
                ) : (
                  property.displayName
                )}
              </Label>
              {isStaged && (
                <Badge variant="outline" className="border-warning text-warning">
                  Modified
                </Badge>
              )}
            </div>
            <Input
              id={property.name}
              type="text"
              value={value || property.defaultValue || ''}
              onChange={(e) => onChange(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? (
                <HighlightedText text={property.description || ''} highlight={searchQuery} />
              ) : (
                property.description
              )}
            </p>
          </div>
        );
    }
  };

  return <div className="w-full">{renderInput()}</div>;
};
