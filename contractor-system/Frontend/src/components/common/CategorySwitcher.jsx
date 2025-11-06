
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Paintbrush, Building, Trash2, Wrench, Lightbulb, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { key: "paint_plaster", label: "צבע ושפכטל", icon: Paintbrush, to: "CostCalculator?tab=paint_plaster" },
  { key: "tiling", label: "ריצוף וחיפוי", icon: Building, to: "CostCalculator?tab=tiling" },
  { key: "demolition", label: "הריסה ופינוי", icon: Trash2, to: "DemolitionCalculator" },
  { key: "plumbing", label: "אינסטלציה", icon: Wrench, to: "ContractorPricing?tab=plumbing" },
  { key: "electricity", label: "חשמל", icon: Lightbulb, to: "ContractorPricing?tab=electricity" },
  { key: "construction", label: "בינוי", icon: Hammer, to: "ContractorPricing?tab=construction" },
];

const colorMap = {
  tiling: { 
    idle: "bg-white text-orange-600 border-orange-200 hover:bg-orange-50", 
    active: "bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-600 shadow-lg shadow-orange-200" 
  },
  paint_plaster: { 
    idle: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50", 
    active: "bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg shadow-blue-200" 
  },
  demolition: { 
    idle: "bg-white text-red-600 border-red-200 hover:bg-red-50", 
    active: "bg-gradient-to-br from-red-500 to-rose-500 text-white border-red-600 shadow-lg shadow-red-200" 
  },
  plumbing: { 
    idle: "bg-white text-teal-600 border-teal-200 hover:bg-teal-50", 
    active: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white border-teal-600 shadow-lg shadow-teal-200" 
  },
  electricity: { 
    idle: "bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50", 
    active: "bg-gradient-to-br from-yellow-500 to-amber-500 text-white border-yellow-600 shadow-lg shadow-yellow-200" 
  },
  construction: { 
    idle: "bg-white text-purple-600 border-purple-200 hover:bg-purple-50", 
    active: "bg-gradient-to-br from-purple-500 to-violet-600 text-white border-purple-600 shadow-lg shadow-purple-200" 
  },
};

export default function CategorySwitcher({ active }) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-16 z-50 bg-white border-b-2 border-gray-200 shadow-md py-6 mb-12">
      <div className="flex flex-wrap gap-3 justify-center items-center px-4">
        {categories.map((cat) => {
          const isActive = active === cat.key;
          const colors = colorMap[cat.key];
          const Icon = cat.icon;

          return (
            <button
              key={cat.key}
              onClick={() => navigate(createPageUrl(cat.to))}
              className={cn(
                "relative group flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-semibold transition-all duration-300",
                isActive ? colors.active : colors.idle,
                isActive ? "scale-105" : "hover:scale-102"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />
              )}
              <Icon className={cn("w-5 h-5 relative z-10", isActive ? "drop-shadow" : "")} />
              <span className="relative z-10">{cat.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
