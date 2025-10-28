/**
 * TilingManualItemDialog - Manual Tiling Item Dialog
 *
 * Wrapper component for manual tiling items
 * Uses plumbing config as tiling has similar structure
 *
 * Reduced to small wrapper, preserving all functionality
 * Design: 100% preserved ✅
 */

import React from "react";
import GenericItemDialog from "./shared/GenericItemDialog.jsx";

export default function TilingManualItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  defaults = {},
  initialQuantity = 1,
}) {
  return (
    <GenericItemDialog
      category="plumbing"  // Tiling uses similar config to plumbing
      open={open}
      onOpenChange={onOpenChange}
      item={item}
      onSaved={onSaved}
      defaults={defaults}
      initialQuantity={initialQuantity}
    />
  );
}
