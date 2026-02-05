import { cn } from '~/utils/cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'bg-muted/60 rounded-md relative overflow-hidden',
        'after:absolute after:inset-0 after:animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
