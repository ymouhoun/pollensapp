import * as React from 'react';
import { cn } from '@/lib/utils';

const GlassSurface = React.forwardRef(({ className, children, ...props }, ref) => {
  const surfaceId = React.useId().replace(/:/g, '');

  return (
    <>
      <style>{`
        .glass-surface-${surfaceId} {
          background-color: oklch(from var(--foreground) l c h / 5%);
          backdrop-filter: blur(8px) saturate(150%);
          -webkit-backdrop-filter: blur(8px) saturate(150%);
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, white 10%, transparent),
            inset 1.8px 3px 0 -2px color-mix(in srgb, white 90%, transparent),
            inset -2px -2px 0 -2px color-mix(in srgb, white 80%, transparent),
            inset -3px -8px 1px -6px color-mix(in srgb, white 60%, transparent),
            inset -0.3px -1px 4px 0 color-mix(in srgb, black 12%, transparent),
            inset -1.5px 2.5px 0 -2px color-mix(in srgb, black 20%, transparent),
            inset 0 3px 4px -2px color-mix(in srgb, black 20%, transparent),
            inset 2px -6.5px 1px -4px color-mix(in srgb, black 10%, transparent),
            0 1px 5px 0 color-mix(in srgb, black 10%, transparent),
            0 6px 16px 0 color-mix(in srgb, black 8%, transparent);
        }
      `}</style>
      <div ref={ref} className={cn(`glass-surface-${surfaceId}`, className)} {...props}>
        {children}
      </div>
    </>
  );
});

GlassSurface.displayName = 'GlassSurface';
export { GlassSurface };