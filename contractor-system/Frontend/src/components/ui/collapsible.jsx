import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * CollapsibleTrigger
 * - Supports `asChild` via Radix <Slot>
 * - Never forwards `open` / `onOpenChange` / `asChild` to a native DOM node
 */
export const CollapsibleTrigger = React.forwardRef(function CollapsibleTrigger(
  { className, children, asChild, ...props },
  ref
) {
  const { open, onOpenChange, ...domProps } = props;
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      className={cn("cursor-pointer", className)}
      onClick={() => onOpenChange && onOpenChange(!open)}
      {...domProps}
    >
      {children}
    </Comp>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

/**
 * CollapsibleContent
 * - Supports `asChild` via Radix <Slot>
 * - Animates height + opacity
 * - Never forwards `open` / `onOpenChange` / `asChild` to a native DOM node
 */
export const CollapsibleContent = React.forwardRef(function CollapsibleContent(
  { className, children, asChild, ...props },
  ref
) {
  const { open, onOpenChange, ...domProps } = props;
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      style={{
        maxHeight: open ? "2000px" : "0px",
        transition: "max-height 0.3s ease-in-out",
      }}
      className={cn("overflow-hidden", className)}
      {...domProps}
    >
      <div
        className={cn(
          "transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="pt-1 pb-4">{children}</div>
      </div>
    </Comp>
  );
});
CollapsibleContent.displayName = "CollapsibleContent";

/**
 * Collapsible (root)
 * - Accepts `open` and `onOpenChange` and injects them into Trigger/Content children
 * - Intentionally does NOT support `asChild` on the root; it strips it so no warning is produced
 */
export const Collapsible = ({
  open,
  onOpenChange,
  className,
  children,
  asChild, // stripped on purpose to avoid leaking to DOM
  ...rest
}) => {
  return (
    <div className={cn("collapsible-root", className)} {...rest}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childDisplayName = child.type?.displayName;
          if (
            childDisplayName === "CollapsibleTrigger" ||
            childDisplayName === "CollapsibleContent"
          ) {
            return React.cloneElement(child, { open, onOpenChange });
          }
        }
        return child;
      })}
    </div>
  );
};
