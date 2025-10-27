
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Home, Paintbrush, Trash2, Wrench, Lightbulb } from "lucide-react";

export default function CategoryNav({ active = null, onSelectTiling, onSelectPaint, onSelectDemolition, onSelectPlumbing, onSelectElectricity }) {
  const navigate = useNavigate();

  const gotoTiling = () => {
    if (onSelectTiling) return onSelectTiling();
    navigate(createPageUrl("CostCalculator?tab=tiling"));
  };
  const gotoPaint = () => {
    if (onSelectPaint) return onSelectPaint();
    navigate(createPageUrl("CostCalculator?tab=paint_plaster"));
  };
  const gotoDemolition = () => {
    if (onSelectDemolition) return onSelectDemolition();
    navigate(createPageUrl("DemolitionCalculator"));
  };
  const gotoPlumbing = () => {
    if (onSelectPlumbing) return onSelectPlumbing();
    navigate(createPageUrl("ContractorPricing?tab=plumbing"));
  };
  const gotoElectricity = () => {
    if (onSelectElectricity) return onSelectElectricity();
    navigate(createPageUrl("ContractorPricing?tab=electricity"));
  };

  return (
    <div className="mb-6 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-1">
      <div className="flex justify-center gap-2">
        <Button
          variant={active === 'tiling' ? 'default' : 'ghost'}
          onClick={gotoTiling}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            active === 'tiling'
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg'
              : 'text-orange-600 hover:bg-orange-50'
          }`}
        >
          <Home className="w-5 h-5" />
          ריצוף וחיפוי
        </Button>

        <Button
          variant={active === 'paint_plaster' ? 'default' : 'ghost'}
          onClick={gotoPaint}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            active === 'paint_plaster'
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
              : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Paintbrush className="w-5 h-5" />
          צבע ושפכטל
        </Button>

        <Button
          variant={active === 'demolition' ? 'default' : 'ghost'}
          onClick={gotoDemolition}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            active === 'demolition'
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
              : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-5 h-5" />
          הריסה ופינוי
        </Button>

        <Button
          variant={active === 'plumbing' ? 'default' : 'ghost'}
          onClick={gotoPlumbing}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            active === 'plumbing'
              ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg'
              : 'text-teal-600 hover:bg-teal-50'
          }`}
        >
          <Wrench className="w-5 h-5" />
          אינסטלציה
        </Button>

        <Button
          variant={active === 'electricity' ? 'default' : 'ghost'}
          onClick={gotoElectricity}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            active === 'electricity'
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg'
              : 'text-yellow-600 hover:bg-yellow-50'
          }`}
        >
          <Lightbulb className="w-5 h-5" />
          חשמל
        </Button>
      </div>
    </div>
  );
}
