import React, { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Calculator, Briefcase, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_NAMES = {
  cat_paint_plaster: 'צבע ושפכטל',
  cat_tiling: 'ריצוף וחיפוי',
  cat_demolition: 'הריסה ופינוי',
  cat_construction: 'בינוי (כללי)',
  cat_plumbing: 'אינסטלציה',
  cat_electricity: 'חשמל',
};

// קטגוריות עם הפרדה לעבודה וחומרים
const LABOR_MATERIAL_CATEGORIES = ['cat_paint_plaster', 'cat_tiling', 'cat_construction'];

// קטגוריות עם עבודה בלבד (ללא חומרים)
const LABOR_ONLY_CATEGORIES = ['cat_demolition'];

// קטגוריות קבלני משנה
const SUBCONTRACTOR_CATEGORIES = ['cat_plumbing', 'cat_electricity'];

export default function ContractorCostBreakdown({ selectedItems = [], projectComplexities = {} }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const breakdown = useMemo(() => {
    const result = {};
    let grandTotal = 0;

    // Process items by category
    selectedItems.forEach(item => {
      const catId = item.categoryId;
      if (!catId) return;

      const itemCost = Number(item.totalCost || 0);
      if (itemCost <= 0) return;

      if (!result[catId]) {
        result[catId] = {
          name: CATEGORY_NAMES[catId] || catId,
          isSubcontractor: SUBCONTRACTOR_CATEGORIES.includes(catId),
          isLaborOnly: LABOR_ONLY_CATEGORIES.includes(catId),
          laborCost: 0,
          materialCost: 0,
          totalCost: 0,
        };
      }

      if (LABOR_MATERIAL_CATEGORIES.includes(catId)) {
        // עבודה וחומרים נפרדים
        const labor = Number(item.laborCost || 0);
        const material = Number(item.materialCost || 0);
        result[catId].laborCost += labor;
        result[catId].materialCost += material;
        result[catId].totalCost += itemCost;
      } else if (LABOR_ONLY_CATEGORIES.includes(catId)) {
        // עבודה בלבד (כמו הריסה)
        const labor = Number(item.laborCost || itemCost || 0);
        result[catId].laborCost += labor;
        result[catId].totalCost += itemCost;
      } else if (SUBCONTRACTOR_CATEGORIES.includes(catId)) {
        // קבלן משנה - סכום כולל
        result[catId].totalCost += itemCost;
      } else {
        // קטגוריה לא מוכרת - נחשיב ככולל
        result[catId].totalCost += itemCost;
      }

      grandTotal += itemCost;
    });

    // Add additional costs (contractor costs only)
    const additionalCosts = (projectComplexities?.additionalCostDetails || [])
      .reduce((sum, cost) => sum + (Number(cost.contractorCost) || 0), 0);

    return {
      categories: result,
      additionalCosts,
      grandTotal: grandTotal + additionalCosts,
    };
  }, [selectedItems, projectComplexities]);

  const formatPrice = (price) => {
    return `₪${(Number(price) || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const hasAnyCosts = breakdown.grandTotal > 0;

  if (!hasAnyCosts) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
            isOpen
              ? "bg-indigo-50 border-indigo-300 shadow-sm"
              : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isOpen ? "bg-indigo-100" : "bg-gray-200"
            )}>
              <Calculator className={cn("w-5 h-5", isOpen ? "text-indigo-600" : "text-gray-600")} />
            </div>
            <div className="text-right">
              <h3 className={cn(
                "text-base font-bold transition-colors",
                isOpen ? "text-indigo-900" : "text-gray-800"
              )}>
                פירוט עלויות קבלן
              </h3>
              <p className="text-sm text-gray-600">לחץ לצפייה בפירוט המלא לפי קטגוריות</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="text-xs text-gray-500">סה"כ עלויות</div>
              <div className="text-lg font-bold text-red-600">{formatPrice(breakdown.grandTotal)}</div>
            </div>
            <ChevronDown className={cn(
              "w-5 h-5 transition-transform text-gray-500",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gradient-to-l from-gray-100 to-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">פירוט עלויות לפי קטגוריות</h4>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Labor & Material Categories */}
            {Object.entries(breakdown.categories)
              .filter(([catId]) => LABOR_MATERIAL_CATEGORIES.includes(catId))
              .map(([catId, data]) => (
                <div key={catId} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-semibold text-gray-800">{data.name}</div>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <div>עבודה: {formatPrice(data.laborCost)}</div>
                          <div>חומרים: {formatPrice(data.materialCost)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-gray-500">סה"כ</div>
                      <div className="text-base font-bold text-red-600">{formatPrice(data.totalCost)}</div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Labor Only Categories (e.g., Demolition) */}
            {Object.entries(breakdown.categories)
              .filter(([catId]) => LABOR_ONLY_CATEGORIES.includes(catId))
              .map(([catId, data]) => (
                <div key={catId} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-semibold text-gray-800">{data.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          עבודה בלבד: {formatPrice(data.laborCost)}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-gray-500">סה"כ</div>
                      <div className="text-base font-bold text-red-600">{formatPrice(data.totalCost)}</div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Subcontractor Categories */}
            {Object.entries(breakdown.categories)
              .filter(([catId]) => SUBCONTRACTOR_CATEGORIES.includes(catId))
              .map(([catId, data]) => (
                <div key={catId} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-semibold text-gray-800">{data.name}</div>
                        <div className="text-xs text-gray-500 mt-1">קבלן משנה</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-gray-500">סה"כ</div>
                      <div className="text-base font-bold text-red-600">{formatPrice(data.totalCost)}</div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Additional Costs */}
            {breakdown.additionalCosts > 0 && (
              <div className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-semibold text-gray-800">עלויות לוגיסטיקה ושינוע</div>
                      <div className="text-xs text-gray-500 mt-1">עלויות נוספות לפרויקט</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-gray-500">סה"כ</div>
                    <div className="text-base font-bold text-red-600">{formatPrice(breakdown.additionalCosts)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-l from-red-50 to-white px-4 py-3 border-t-2 border-red-200">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-800">סה"כ עלויות קבלן</div>
              <div className="text-xl font-bold text-red-700">{formatPrice(breakdown.grandTotal)}</div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}