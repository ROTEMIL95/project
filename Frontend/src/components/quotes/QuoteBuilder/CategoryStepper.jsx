import React from "react";
import { cn } from "@/lib/utils";

const COLOR_MAP = {
  cat_paint_plaster: {
    base: "text-blue-700",
    chip: "bg-blue-50/40 text-blue-700 border-blue-200 hover:bg-blue-100",
    active: "bg-blue-100 text-blue-800 border-blue-300",
  },
  cat_tiling: {
    base: "text-orange-700",
    chip: "bg-orange-50/40 text-orange-700 border-orange-200 hover:bg-orange-100",
    active: "bg-orange-100 text-orange-800 border-orange-300",
  },
  cat_demolition: {
    base: "text-rose-700",
    chip: "bg-rose-50/40 text-rose-700 border-rose-200 hover:bg-rose-100",
    active: "bg-rose-100 text-rose-800 border-rose-300",
  },
  cat_electricity: {
    base: "text-yellow-700",
    chip: "bg-yellow-50/40 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    active: "bg-yellow-100 text-yellow-900 border-yellow-300",
  },
  cat_plumbing: {
    base: "text-teal-700",
    chip: "bg-teal-50/40 text-teal-700 border-teal-200 hover:bg-teal-100",
    active: "bg-teal-100 text-teal-800 border-teal-300",
  },
  cat_construction: {
    base: "text-purple-700",
    chip: "bg-purple-50/40 text-purple-700 border-purple-200 hover:bg-purple-100",
    active: "bg-purple-100 text-purple-800 border-purple-300",
  },
};

export default function CategoryStepper({ categories = [], currentId, onSelect }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => {
          const colors = COLOR_MAP[cat.id] || COLOR_MAP.cat_construction;
          const isActive = cat.id === currentId;

          return (
            <button
              key={cat.id}
              onClick={() => onSelect && onSelect(cat.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm border transition-colors",
                isActive ? colors.active : colors.chip,
                "whitespace-nowrap"
              )}
              title={cat.name}
            >
              <span className={cn("font-medium", isActive ? "" : "")}>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}