import * as React from "react"

import { cn, MAX_PRICE, MAX_QUANTITY } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, onChange, ...props }, ref) => {
  // הגבלת קלט למספרים
  const handleNumberInput = React.useCallback((e) => {
    if (type === "number") {
      const value = e.target.value;

      // אם השדה ריק או סימן מינוס, לא נעשה כלום
      if (value === '' || value === '-') {
        if (onChange) onChange(e);
        return;
      }

      const numValue = parseFloat(value);

      // בדיקה אם זה מספר תקין
      if (isNaN(numValue)) {
        e.preventDefault();
        return;
      }

      // הגבלה לפי MAX_PRICE (99,999,999)
      if (numValue > MAX_PRICE) {
        e.target.value = MAX_PRICE;
        // יצירת אירוע חדש עם הערך המוגבל
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: MAX_PRICE.toString() }
        };
        if (onChange) onChange(syntheticEvent);
        return;
      }

      // הגבלה למספרים שליליים (אם לא מותר)
      if (numValue < 0 && props.min !== undefined && numValue < props.min) {
        e.target.value = props.min;
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: props.min.toString() }
        };
        if (onChange) onChange(syntheticEvent);
        return;
      }
    }

    if (onChange) onChange(e);
  }, [type, onChange, props.min]);

  return (
    (<input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // הגבלת רוחב לשדות number כדי למנוע גלישה חזותית עם מספרים גדולים
        type === "number" && "tabular-nums",
        className
      )}
      ref={ref}
      onChange={handleNumberInput}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
