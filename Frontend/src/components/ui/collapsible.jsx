import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Collapsible = ({ open, onOpenChange, children, ...props }) => {
  return (
    <div className="collapsible-root" {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Pass down the state and handler to direct children
          return React.cloneElement(child, { open, onOpenChange });
        }
        return child;
      })}
    </div>
  );
};

const CollapsibleTrigger = React.forwardRef(({ className, children, open, onOpenChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("cursor-pointer", className)}
    onClick={() => onOpenChange && onOpenChange(!open)}
    {...props}
  >
    {children}
  </div>
));

CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef(({ className, children, open, ...props }, ref) => (
  <div
    ref={ref}
    style={{
      maxHeight: open ? '2000px' : '0px',
      transition: 'max-height 0.3s ease-in-out',
    }}
    className={cn(
      "overflow-hidden",
      className
    )}
    {...props}
  >
    <div className={cn("transition-opacity duration-300", open ? 'opacity-100' : 'opacity-0')}>
        <div className="pt-1 pb-4">
            {children}
        </div>
    </div>
  </div>
));

CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent }