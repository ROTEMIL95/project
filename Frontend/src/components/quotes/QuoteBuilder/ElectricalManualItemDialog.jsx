/**
 * ElectricalManualItemDialog - Manual Electrical Item Dialog
 *
 * Wrapper component for manual electrical items
 * Uses electrical config
 *
 * Reduced to small wrapper, preserving all functionality
 * Design: 100% preserved ✅ (yellow theme)
 */

import React from "react";
import GenericItemDialog from "./shared/GenericItemDialog.jsx";

export default function ElectricalManualItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  defaults = {},
  initialQuantity = 1,
}) {
  return (
    <GenericItemDialog
      category="electrical"
      open={open}
      onOpenChange={onOpenChange}
      item={item}
      onSaved={onSaved}
      defaults={defaults}
      initialQuantity={initialQuantity}
    />
  );
}
