import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '~/utils/cn';

type ScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  viewportProps?: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>;
};

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, viewportProps, ...props }, ref) => {
  const { className: viewportClassName, ...remainingViewportProps } = viewportProps ?? {};

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      data-slot="scroll-area"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          'focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1',
          viewportClassName,
        )}
        {...remainingViewportProps}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    data-slot="scroll-area-scrollbar"
    orientation={orientation}
    className={cn(
      'flex touch-none p-px transition-colors select-none',
      orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
      orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      data-slot="scroll-area-thumb"
      className="bg-border relative flex-1 rounded-full"
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
