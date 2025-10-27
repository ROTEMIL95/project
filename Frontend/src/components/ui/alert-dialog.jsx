import * as React from "react"
import { cn } from "@/lib/utils"

const AlertDialog = ({ open, onOpenChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(open || false);
  
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  return (
    <div>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            isOpen, 
            onOpenChange: handleOpenChange 
          });
        }
        return child;
      })}
    </div>
  );
};

const AlertDialogTrigger = React.forwardRef(({ className, children, isOpen, onOpenChange, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(className)}
    onClick={() => onOpenChange && onOpenChange(true)}
    {...props}
  >
    {children}
  </button>
));

const AlertDialogContent = React.forwardRef(({ className, children, isOpen, onOpenChange, ...props }, ref) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-black/30 transition-opacity"
          onClick={() => onOpenChange && onOpenChange(false)}
        />
        <div
          ref={ref}
          className={cn(
            "relative bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all w-[95%] sm:max-w-lg sm:w-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

const AlertDialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "px-6 py-4 border-b border-gray-100",
      className
    )}
    {...props}
  />
);

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-medium leading-6 text-gray-900",
      className
    )}
    {...props}
  />
));

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-2 text-sm text-gray-500",
      className
    )}
    {...props}
  />
));

const AlertDialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "px-6 py-4 border-t border-gray-100 flex flex-row-reverse gap-3",
      className
    )}
    {...props}
  />
);

const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2",
      "bg-red-600 hover:bg-red-700 focus:ring-red-500",
      className
    )}
    {...props}
  />
));

const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
      className
    )}
    {...props}
  />
));

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};