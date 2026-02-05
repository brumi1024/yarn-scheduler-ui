import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:shadow-md group-[.toast]:font-medium',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium',
          success:
            'group-[.toaster]:border-l-4 group-[.toaster]:border-l-green-500 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-green-50 group-[.toaster]:to-background dark:group-[.toaster]:from-green-950/30',
          error:
            'group-[.toaster]:border-l-4 group-[.toaster]:border-l-destructive group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-red-50 group-[.toaster]:to-background dark:group-[.toaster]:from-red-950/30',
          warning:
            'group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-amber-50 group-[.toaster]:to-background dark:group-[.toaster]:from-amber-950/30',
          info: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-blue-50 group-[.toaster]:to-background dark:group-[.toaster]:from-blue-950/30',
        },
      }}
    />
  );
}
