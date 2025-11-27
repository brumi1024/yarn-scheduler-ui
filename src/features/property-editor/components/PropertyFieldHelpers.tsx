/**
 * Property field helper components
 *
 * Shared components for property form fields.
 */

import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { FieldLabel, FieldMessage } from '~/components/ui/field';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/utils/cn';
import type { PropertyDescriptor } from '~/types/property-descriptor';

export interface PropertyLabelProps {
  property: PropertyDescriptor;
  stagedStatus?: 'new' | 'modified' | 'deleted';
  isEnabled: boolean;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

export const PropertyLabel: React.FC<PropertyLabelProps> = ({
  property,
  stagedStatus,
  isEnabled,
  className,
  contentClassName,
  children,
}) => (
  <FieldLabel
    className={cn('flex items-center gap-1', className, !isEnabled && 'text-muted-foreground')}
  >
    <div className={cn('flex items-center gap-1 min-w-0', contentClassName)}>
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
    {children}
  </FieldLabel>
);

export const renderBusinessErrorsList = (
  fieldName: string,
  messages: string[],
): React.ReactNode => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 space-y-1">
      {messages.map((message) => (
        <div key={`business-error-${fieldName}-${message}`} className="text-xs text-destructive">
          {message}
        </div>
      ))}
    </div>
  );
};

export interface PropertyWarningsProps {
  warnings: string[];
}

export const PropertyWarnings: React.FC<PropertyWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 space-y-1">
      {warnings.map((warning) => {
        const isLegacyMode = warning.includes('legacy mode requirement');
        return (
          <div key={`warning-${warning}`} className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
            <p className="text-sm text-yellow-600 dark:text-yellow-500">{warning}</p>
            {isLegacyMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="mt-0.5 h-3.5 w-3.5 cursor-help flex-shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    This validation is enforced because legacy queue mode is enabled. You can
                    disable legacy mode in Global Settings for more flexible capacity configuration.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
};

export interface FieldErrorProps {
  error?: { message?: string };
  inlineBusinessError?: string;
}

export const renderFieldMessage = ({
  error,
  inlineBusinessError,
}: FieldErrorProps): React.ReactNode => {
  if (!error && !inlineBusinessError) {
    return null;
  }
  return <FieldMessage>{error ? String(error.message ?? '') : inlineBusinessError}</FieldMessage>;
};

export const getCommonFieldClassName = (
  stagedStatus?: 'new' | 'modified' | 'deleted',
  hasError?: boolean,
): string => {
  return cn(
    stagedStatus === 'modified' && 'ring-2 ring-primary ring-offset-1',
    hasError && 'ring-2 ring-destructive ring-offset-1',
  );
};

export const parseFieldErrors = (
  errors: string[] = [],
): { inline?: string; remaining: string[] } => {
  const fieldErrors = errors
    .map((message) => (typeof message === 'string' ? message.trim() : ''))
    .filter((message) => message.length > 0);

  return {
    inline: fieldErrors[0],
    remaining: fieldErrors.slice(1),
  };
};
