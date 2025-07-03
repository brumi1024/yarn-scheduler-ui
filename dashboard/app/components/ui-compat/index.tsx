// Component mapping from MUI to shadcn/ui
// This provides a compatibility layer for gradual migration

import type { ReactNode } from 'react';
import { Button as ShadcnButton } from '../ui/button';
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert as ShadcnAlert, AlertDescription } from '../ui/alert';
import { Badge as ShadcnBadge } from '../ui/badge';
import { cn } from '~/lib/utils';

// Button mapping
interface ButtonProps {
  variant?: 'text' | 'contained' | 'outlined';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export function Button({ 
  variant = 'text', 
  color = 'primary', 
  size = 'medium',
  disabled,
  onClick,
  children,
  className,
  startIcon,
  endIcon
}: ButtonProps) {
  // Map MUI variants to shadcn variants
  const shadcnVariant = variant === 'contained' ? 'default' : 
                       variant === 'outlined' ? 'outline' : 
                       'ghost';
  
  // Map sizes
  const shadcnSize = size === 'small' ? 'sm' : 
                     size === 'large' ? 'lg' : 
                     'default';

  return (
    <ShadcnButton
      variant={shadcnVariant}
      size={shadcnSize}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        color === 'error' && 'text-red-600 hover:text-red-700',
        color === 'warning' && 'text-yellow-600 hover:text-yellow-700',
        color === 'success' && 'text-green-600 hover:text-green-700',
        className
      )}
    >
      {startIcon && <span className="mr-2">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-2">{endIcon}</span>}
    </ShadcnButton>
  );
}

// Paper/Card mapping
interface PaperProps {
  elevation?: number;
  children: ReactNode;
  className?: string;
}

export function Paper({ children, className }: PaperProps) {
  return (
    <ShadcnCard className={className}>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </ShadcnCard>
  );
}

// Typography mapping
interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption';
  children: ReactNode;
  className?: string;
  color?: 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'error';
}

export function Typography({ variant = 'body1', children, className, color }: TypographyProps) {
  const variantClasses = {
    h1: 'text-4xl font-bold',
    h2: 'text-3xl font-bold',
    h3: 'text-2xl font-semibold',
    h4: 'text-xl font-semibold',
    h5: 'text-lg font-medium',
    h6: 'text-base font-medium',
    body1: 'text-base',
    body2: 'text-sm',
    caption: 'text-xs text-muted-foreground'
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    textPrimary: 'text-foreground',
    textSecondary: 'text-muted-foreground',
    error: 'text-destructive'
  };

  const Component = variant.startsWith('h') ? variant : 'p';

  return (
    <Component 
      className={cn(
        variantClasses[variant],
        color && colorClasses[color],
        className
      )}
    >
      {children}
    </Component>
  );
}

// Box mapping (just a div with className)
interface BoxProps {
  children: ReactNode;
  className?: string;
  sx?: any; // Ignore sx prop, use className instead
}

export function Box({ children, className }: BoxProps) {
  return <div className={className}>{children}</div>;
}

// Alert mapping
interface AlertProps {
  severity?: 'error' | 'warning' | 'info' | 'success';
  children: ReactNode;
  className?: string;
}

export function Alert({ severity = 'info', children, className }: AlertProps) {
  return (
    <ShadcnAlert 
      variant={severity === 'error' ? 'destructive' : 'default'}
      className={cn(
        severity === 'warning' && 'border-yellow-600 text-yellow-600',
        severity === 'success' && 'border-green-600 text-green-600',
        severity === 'info' && 'border-blue-600 text-blue-600',
        className
      )}
    >
      <AlertDescription>{children}</AlertDescription>
    </ShadcnAlert>
  );
}

// Chip/Badge mapping
interface ChipProps {
  label: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium';
  className?: string;
}

export function Chip({ label, color = 'primary', className }: ChipProps) {
  return (
    <ShadcnBadge
      variant={color === 'error' ? 'destructive' : 'default'}
      className={cn(
        color === 'warning' && 'bg-yellow-100 text-yellow-800',
        color === 'success' && 'bg-green-100 text-green-800',
        color === 'info' && 'bg-blue-100 text-blue-800',
        className
      )}
    >
      {label}
    </ShadcnBadge>
  );
}

// CircularProgress/Spinner mapping
export function CircularProgress({ className }: { className?: string }) {
  return (
    <div className={cn("animate-spin rounded-full h-4 w-4 border-b-2 border-primary", className)} />
  );
}