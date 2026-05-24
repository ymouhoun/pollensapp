import * as React from "react";
import { cn } from "@/lib/utils";

const GlassMenuBar = React.forwardRef(({ className, children, ...props }, ref) => {
  const filterId = React.useId().replace(/:/g, "");

  return (
    <>
      <style>{`
        .glass-bar-${filterId} {
          background-color: oklch(from var(--foreground) l c h / 5%);
          backdrop-filter: blur(8px) saturate(150%);
          -webkit-backdrop-filter: blur(8px) saturate(150%);
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, white 10%, transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, white 90%, transparent), 
            inset -2px -2px 0px -2px color-mix(in srgb, white 80%, transparent), 
            inset -3px -8px 1px -6px color-mix(in srgb, white 60%, transparent), 
            inset -0.3px -1px 4px 0px color-mix(in srgb, black 12%, transparent), 
            inset -1.5px 2.5px 0px -2px color-mix(in srgb, black 20%, transparent), 
            inset 0px 3px 4px -2px color-mix(in srgb, black 20%, transparent), 
            inset 2px -6.5px 1px -4px color-mix(in srgb, black 10%, transparent), 
            0px 1px 5px 0px color-mix(in srgb, black 10%, transparent), 
            0px 6px 16px 0px color-mix(in srgb, black 8%, transparent);
        }
        .glass-bar-item-${filterId} {
          color: oklch(from var(--foreground) l c h / 70%);
          transition: color 200ms ease, background-color 200ms ease;
        }
        .glass-bar-item-${filterId}:hover {
          color: oklch(from var(--foreground) l c h / 95%);
          background-color: oklch(from var(--foreground) l c h / 8%);
        }
        .glass-bar-item-${filterId}:active {
          transform: scale(0.92);
        }
      `}</style>

      <div
        ref={ref}
        className={cn(
          `glass-bar-${filterId} rounded-full flex items-center gap-0.5 p-1.5`,
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, {
            className: cn(
              `glass-bar-item-${filterId} h-9 w-9 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 ease-out`,
              child.props.className
            ),
          });
        })}
      </div>
    </>
  );
});
GlassMenuBar.displayName = "GlassMenuBar";

export { GlassMenuBar };