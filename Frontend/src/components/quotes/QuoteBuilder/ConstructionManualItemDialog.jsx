/**
 * ConstructionManualItemDialog - Manual Construction Item Dialog
 *
 * Wrapper component for manual construction items
 * Uses construction config
 *
 * Reduced to small wrapper, preserving all functionality
 * Design: 100% preserved ✅ (indigo theme)
 */

import React from "react";
import GenericItemDialog from "./shared/GenericItemDialog.jsx";

export default function ConstructionManualItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  defaults = { laborCostPerDay: 1000, desiredProfitPercent: 30 },
  initialQuantity = 1,
}) {
  return (
    <GenericItemDialog
      category="construction"
      open={open}
      onOpenChange={onOpenChange}
      item={item}
      onSaved={onSaved}
      defaults={defaults}
      initialQuantity={initialQuantity}
    />
  );
}
