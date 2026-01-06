import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";

export interface PriceInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange"
> {
  onChange?: (value: string) => void;
}

export const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  (
    { className, onChange, onBlur, onFocus, value: controlledValue, ...props },
    forwardedRef
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const ref = forwardedRef || inputRef;
    const [internalValue, setInternalValue] = useState<string>("");

    // Determine if component is controlled or uncontrolled
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Replace comma with dot (input masking) - must happen first
      inputValue = inputValue.replace(/,/g, ".");

      // Remove any characters that aren't digits or dots (input masking)
      inputValue = inputValue.replace(/[^\d.]/g, "");

      // Ensure only one dot exists
      const parts = inputValue.split(".");
      if (parts.length > 2) {
        inputValue = parts[0] + "." + parts.slice(1).join("");
      }

      // Limit to 2 decimal places (input masking)
      const updatedParts = inputValue.split(".");
      if (updatedParts.length === 2 && updatedParts[1].length > 2) {
        inputValue = updatedParts[0] + "." + updatedParts[1].slice(0, 2);
      }

      // Update internal state for uncontrolled mode
      if (!isControlled) {
        setInternalValue(inputValue);
      }

      // Update the input value directly to ensure immediate visual feedback
      // This ensures the comma is replaced even if onChange doesn't update the value prop
      e.target.value = inputValue;

      if (onChange) {
        onChange(inputValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Get current value from input element
      let formattedValue = e.target.value.trim();

      // If empty, set to "0.00"
      if (!formattedValue || formattedValue === "") {
        formattedValue = "0.00";
      } else {
        // Replace comma with dot (in case user pasted something)
        formattedValue = formattedValue.replace(/,/g, ".");

        // Remove any non-digit/non-dot characters
        formattedValue = formattedValue.replace(/[^\d.]/g, "");

        // If after cleaning it's empty, set to "0.00"
        if (!formattedValue || formattedValue === "") {
          formattedValue = "0.00";
        } else {
          // Ensure only one dot exists
          const parts = formattedValue.split(".");
          if (parts.length > 2) {
            formattedValue = parts[0] + "." + parts.slice(1).join("");
          }

          // Add decimal point and zeros if not present
          if (!formattedValue.includes(".")) {
            formattedValue = formattedValue + ".00";
          } else {
            const [whole, decimal] = formattedValue.split(".");
            // Handle case where whole part might be empty (e.g., ".5")
            const wholePart = whole || "0";
            if (decimal.length === 0) {
              formattedValue = wholePart + ".00";
            } else if (decimal.length === 1) {
              formattedValue = wholePart + "." + decimal + "0";
            } else if (decimal.length > 2) {
              // Limit to 2 decimal places
              formattedValue = wholePart + "." + decimal.slice(0, 2);
            } else {
              // Already has 2 decimal places, ensure whole part exists
              formattedValue = wholePart + "." + decimal;
            }
          }
        }
      }

      // Update internal state for uncontrolled mode
      if (!isControlled) {
        setInternalValue(formattedValue);
      }

      // Update the input value directly to ensure visual feedback
      e.target.value = formattedValue;

      // Update the value with formatted version
      if (onChange) {
        onChange(formattedValue);
      }

      if (onBlur) {
        onBlur(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text when input is focused
      e.target.select();

      if (onFocus) {
        onFocus(e);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        placeholder="0.00"
        value={value}
        {...props}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
    );
  }
);

PriceInput.displayName = "PriceInput";
