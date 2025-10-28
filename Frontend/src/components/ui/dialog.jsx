
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className="min-h-full flex items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-black/30 transition-opacity"
          onClick={() => onOpenChange(false)}
        />
        {children}
      </div>
    </div>
  );
};

const DialogContent = React.forwardRef(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative bg-white rounded-xl text-right overflow-hidden shadow-xl transform transition-all w-[95%] sm:max-w-5xl sm:w-full z-[201]",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "px-6 py-4 border-b border-gray-100",
      className
    )}
    {...props}
  />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-medium leading-6 text-gray-900",
      className
    )}
    {...props}
  />
));

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "px-6 py-4 border-t border-gray-100",
      className
    )}
    {...props}
  />
);

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-2 text-sm text-gray-500",
      className
    )}
    {...props}
  />
));

const DialogClose = React.forwardRef(({ className, onClick, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "absolute left-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none",
      className
    )}
    onClick={onClick}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </button>
));

const DialogTrigger = ({ children, ...props }) => (
  <div {...props}>
    {children}
  </div>
);

DialogContent.displayName = "DialogContent";
DialogHeader.displayName = "DialogHeader";
DialogTitle.displayName = "DialogTitle";
DialogFooter.displayName = "DialogFooter";
DialogDescription.displayName = "DialogDescription";
DialogClose.displayName = "DialogClose";
DialogTrigger.displayName = "DialogTrigger";

// Add default export
export default Dialog;

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
  DialogTrigger
};
