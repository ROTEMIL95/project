
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Paintbrush, Trash2, Wrench, Lightbulb, Hammer, ArrowLeft } from "lucide-react";
import { useUser } from "@/components/utils/UserContext";

const blocks = [
  {
    key: "paint_plaster",
    title: "צבע ושפכטל",
    desc: "עבודות צבע, שפכטל והכנות",
    icon: Paintbrush,
    gradient: "from-blue-500 to-cyan-500",
    to: createPageUrl("CostCalculator?tab=paint_plaster"),
  },
  {
    key: "tiling",
    title: "ריצוף וחיפוי",
    desc: "ריצוף, חיפוי ועבודות קרמיקה",
    icon: Building,
    gradient: "from-orange-500 to-amber-500",
    to: createPageUrl("CostCalculator?tab=tiling"),
  },
  {
    key: "demolition",
    title: "הריסה ופינוי",
    desc: "עבודות הריסה, פירוק ופינוי",
    icon: Trash2,
    gradient: "from-red-500 to-rose-500",
    to: createPageUrl("DemolitionCalculator"),
  },
  {
    key: "plumbing",
    title: "אינסטלציה",
    desc: "צנרת, נקודות מים וניקוז",
    icon: Wrench,
    gradient: "from-teal-500 to-emerald-500",
    to: createPageUrl("ContractorPricing?tab=plumbing"),
  },
  {
    key: "electricity",
    title: "חשמל",
    desc: "נקודות חשמל, תאורה ותקשורת",
    icon: Lightbulb,
    gradient: "from-yellow-500 to-amber-500",
    to: createPageUrl("ContractorPricing?tab=electricity"),
  },
  {
    key: "construction",
    title: "בינוי (כללי)",
    desc: "קירות, תקרות, חציבות, טיח ועוד",
    icon: Hammer,
    gradient: "from-purple-500 to-violet-600", // Changed gradient from gray to purple/violet
    to: createPageUrl("ContractorPricing?tab=construction"),
  },
];

export default function ContractorPricingLanding() {
  const navigate = useNavigate();
  const { user } = useUser();
  const m = user?.categoryActiveMap || {};

  const filteredBlocks = blocks.filter((b) => {
    switch (b.key) {
      case "plumbing":
        return m.cat_plumbing !== false;
      case "electricity":
        return m.cat_electricity !== false;
      case "construction":
        return m.cat_construction !== false;
      default:
        return true; // Always show other blocks
    }
  });

  return (
    <div dir="rtl" className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBlocks.map((b) => {
          const Icon = b.icon;
          return (
            <Card
              key={b.key}
              className="relative group overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/95 backdrop-blur-sm border-0 cursor-pointer transform hover:-translate-y-1.5 shimmer-element rounded-2xl min-h-[180px]"
              onClick={() => navigate(b.to)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <CardHeader className="relative pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl text-white shadow-md bg-gradient-to-br ${b.gradient}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                <CardTitle className="text-2xl font-extrabold text-gray-800 mt-4">{b.title}</CardTitle>
                <CardDescription className="text-gray-600 text-base">{b.desc}</CardDescription>
              </CardHeader>
              <CardContent className="relative pb-6 pt-0">
                <Button
                  variant="outline"
                  className="rounded-full px-5 py-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(b.to);
                  }}
                >
                  פתח מחירון
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
