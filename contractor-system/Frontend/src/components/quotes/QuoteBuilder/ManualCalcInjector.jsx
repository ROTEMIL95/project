import React, { useEffect } from "react";

/**
 * DISABLED: Manual calc button injection inside paint/plaster areas.
 * Now we have a dedicated external button below the dates section.
 * This component is kept for potential future use but does nothing now.
 */
export default function ManualCalcInjector({ containerSelector = "#quote-create-root" }) {
  useEffect(() => {
    // Component disabled - manual calc button is now external
    // No injection into individual area blocks
    return () => {};
  }, [containerSelector]);

  return null;
}