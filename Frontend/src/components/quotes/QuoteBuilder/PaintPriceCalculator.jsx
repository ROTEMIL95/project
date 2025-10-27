
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, DollarSign, Clock, Layers, TrendingUp, Package, HardHat, Target, Trash2 } from 'lucide-react'; // Added Trash2
import { identifyPriceTier } from '@/components/costCalculator/PricingService';
import { Button } from "@/components/ui/button"; // Added Button

// פונקציה לחישוב עלויות קבלן לצבע
export function calculatePaintContractorCosts(paintItem, quantity, selectedLayers = 1, layerSettings = []) {
  if (!paintItem || !quantity || quantity <= 0) {
    return {
      materialCost: 0,
      laborCost: 0,
      totalCost: 0,
      workDays: 0,
      rawWorkDays: 0,
      rawTotalCost: 0
    };
  }

  // Base values from paintItem
  const baseDailyOutput = paintItem.dailyOutput || paintItem.hespekYomi || 100;
  const baseCoverage = paintItem.coverage || 10;
  const laborCostPerDay = paintItem.laborCost || 500;
  const materialCostPerLiter = paintItem.materialCost || 50;

  let totalLitersNeeded = 0;
  let totalWorkDaysRawForCalculation = 0; // Sum of raw work days for each layer based on its specific daily output

  for (let i = 0; i < selectedLayers; i++) {
    const currentLayerSettings = layerSettings[i] || {};
    const layerCoverage = currentLayerSettings.coverage || baseCoverage;
    const layerDailyOutput = currentLayerSettings.dailyOutput || baseDailyOutput;

    // Material cost calculation for this layer
    totalLitersNeeded += (quantity / layerCoverage);

    // Labor cost calculation for this layer
    // Calculate work days for this specific layer's quantity
    // Each layer covers the full quantity, so quantity remains constant.
    totalWorkDaysRawForCalculation += (quantity / layerDailyOutput);
  }

  const materialCost = totalLitersNeeded * materialCostPerLiter;
  
  const rawWorkDays = totalWorkDaysRawForCalculation; // Total raw work days considering all layers' outputs
  const workDays = Math.ceil(rawWorkDays); // Round up total work days for labor cost
  const laborCost = workDays * laborCostPerDay;
  const rawLaborCost = rawWorkDays * laborCostPerDay;
  
  return {
    materialCost: Math.round(materialCost),
    laborCost: Math.round(laborCost),
    totalCost: Math.round(materialCost + laborCost),
    workDays: workDays,
    rawWorkDays: parseFloat(rawWorkDays.toFixed(2)),
    rawTotalCost: Math.round(materialCost + rawLaborCost)
  };
}

export default function PaintPriceCalculator({ paintItem, quantity, selectedLayers = 1, layerSettings = [] }) {
  if (!paintItem || !quantity || quantity <= 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border text-center text-gray-500">
        <Calculator className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>הזן כמות גדולה מ-0 כדי לראות חישוב מחיר</p>
      </div>
    );
  }

  // Dummy functions to satisfy the JSX structure from the outline.
  // In a real application, these would likely come from a parent component
  // that manages the state of layer settings.
  const handleRemoveLayer = (layerIndex) => {
    console.warn(`handleRemoveLayer called for layer ${layerIndex}. This component is for display and does not modify layer settings.`);
    // A real implementation would filter the layerSettings array and update state.
  };

  const updateLayerSetting = (layerIndex, settingKey, value) => {
    console.warn(`updateLayerSetting called for layer ${layerIndex}, key ${settingKey}, value ${value}. This component is for display and does not modify layer settings.`);
    // A real implementation would create a new array with the updated setting and update state.
  };

  // חישוב עלויות קבלן
  const contractorCosts = calculatePaintContractorCosts(paintItem, quantity, selectedLayers, layerSettings);
  
  // זיהוי מדרגת מחיר נכונה
  const tierResult = identifyPriceTier(quantity, paintItem.id, [paintItem]);
  const basePricePerUnit = tierResult?.tier?.price || paintItem.customerPrice || 0;
  
  // חישוב מחיר ללקוח עם שכבות
  let layerMultiplier = selectedLayers; // Default if layerSettings is empty or invalid
  if (layerSettings && layerSettings.length > 0) {
    layerMultiplier = 0;
    for (let i = 0; i < selectedLayers && i < layerSettings.length; i++) {
      // Use the pricePercent from layerSettings if available, otherwise default to 100% (1)
      layerMultiplier += (layerSettings[i]?.pricePercent / 100) || 1;
    }
  }
  
  const pricePerUnitWithLayers = basePricePerUnit * layerMultiplier;
  const totalCustomerPrice = quantity * pricePerUnitWithLayers;
  
  // חישוב רווח
  const profit = totalCustomerPrice - contractorCosts.totalCost;
  const profitPercent = contractorCosts.totalCost > 0 ? (profit / contractorCosts.totalCost) * 100 : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatNumber = (value, decimals = 1) => {
    return new Intl.NumberFormat('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-blue-800 flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          חישוב מחיר ועלויות - {selectedLayers} שכבות
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* מדרגת מחיר ומחיר בסיסי */}
        <div className="bg-white p-4 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              מדרגת מחיר: {tierResult?.range || 'כללי'}
            </Badge>
            <span className="text-sm text-blue-600">מחיר בסיסי (שכבה 1): ₪{formatCurrency(basePricePerUnit)}</span>
          </div>
        </div>

        {/* פירוט שכבות */}
        {selectedLayers > 1 && (
          <div className="bg-blue-25 p-3 rounded-lg border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
              <Layers className="h-4 w-4 mr-1" />
              פירוט חישוב שכבות:
            </h4>
            <div className="space-y-1 text-sm">
              {Array.from({ length: selectedLayers }, (_, i) => (
                <div key={i} className="flex justify-between">
                  <span>שכבה {i + 1}:</span>
                  <span>{layerSettings[i]?.pricePercent || 100}% = ₪{formatCurrency(basePricePerUnit * ((layerSettings[i]?.pricePercent || 100) / 100))}</span>
                </div>
              ))}
              <Separator className="my-1" />
              <div className="flex justify-between font-medium text-blue-700">
                <span>סה"כ למ"ר:</span>
                <span>₪{formatCurrency(pricePerUnitWithLayers)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-4">
            {/* שכבה 2 */}
            {selectedLayers >= 2 && ( 
                <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            שכבה 2
                        </h4>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLayer(2)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 text-center">
                            <div className="text-blue-600 text-sm font-medium mb-1">כושר כיסוי (מ"ר)</div>
                            <input
                                type="number"
                                value={layerSettings[1]?.coverage || ''} 
                                onChange={(e) => updateLayerSetting(2, 'coverage', e.target.value)}
                                className="w-full text-2xl font-bold text-center border-0 bg-transparent focus:outline-none p-0"
                                placeholder="0"
                            />
                        </div>

                        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 text-center">
                            <div className="text-blue-600 text-sm font-medium mb-1">הספק יומי (מ"ר)</div>
                            <input
                                type="number"
                                value={layerSettings[1]?.dailyOutput || ''} 
                                onChange={(e) => updateLayerSetting(2, 'dailyOutput', e.target.value)}
                                className="w-full text-2xl font-bold text-center border-0 bg-transparent focus:outline-none p-0"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* שכבה 3 */}
            {selectedLayers >= 3 && ( 
                <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            שכבה 3
                        </h4>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLayer(3)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 text-center">
                            <div className="text-blue-600 text-sm font-medium mb-1">כושר כיסוי (מ"ר)</div>
                            <input
                                type="number"
                                value={layerSettings[2]?.coverage || ''} 
                                onChange={(e) => updateLayerSetting(3, 'coverage', e.target.value)}
                                className="w-full text-2xl font-bold text-center border-0 bg-transparent focus:outline-none p-0"
                                placeholder="0"
                            />
                        </div>

                        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 text-center">
                            <div className="text-blue-600 text-sm font-medium mb-1">הספק יומי (מ"ר)</div>
                            <input
                                type="number"
                                value={layerSettings[2]?.dailyOutput || ''} 
                                onChange={(e) => updateLayerSetting(3, 'dailyOutput', e.target.value)}
                                className="w-full text-2xl font-bold text-center border-0 bg-transparent focus:outline-none p-0"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {selectedLayers < 3 && (
            <div className="mt-4">
                {/* This div is likely for an "add layer" button or similar,
                    which is not included in this component's scope but
                    implied by the outline. */}
            </div>
        )}

        {/* מחירים ללקוח */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-1 opacity-90" />
            <div className="text-xs opacity-90">מחיר למ"ר (כולל שכבות)</div>
            <div className="text-xl font-bold">₪{formatCurrency(pricePerUnitWithLayers)}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center">
            <Target className="h-6 w-6 mx-auto mb-1 opacity-90" />
            <div className="text-xs opacity-90">מחיר ללקוח (כולל)</div>
            <div className="text-xl font-bold">₪{formatCurrency(totalCustomerPrice)}</div>
          </div>
        </div>

        {/* עלויות קבלן */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-700 mb-3 flex items-center">
            <Package className="h-4 w-4 mr-1" />
            עלויות קבלן:
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>חומרים:</span>
                <span className="font-medium">₪{formatCurrency(contractorCosts.materialCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>עבודה:</span>
                <span className="font-medium">₪{formatCurrency(contractorCosts.laborCost)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>ימי עבודה:</span>
                <span className="font-medium">{formatNumber(contractorCosts.rawWorkDays, 1)}</span>
              </div>
              <div className="flex justify-between font-semibold text-orange-800">
                <span>סה"כ עלויות:</span>
                <span>₪{formatCurrency(contractorCosts.totalCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* רווחיות */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            רווחיות:
          </h4>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-green-600">רווח כולל:</div>
              <div className="text-lg font-bold text-green-800">₪{formatCurrency(profit)}</div>
            </div>
            <div className="text-left">
              <div className="text-sm text-green-600">אחוז רווח:</div>
              <Badge 
                className={`text-sm font-bold ${
                  profitPercent >= 50 ? 'bg-green-500' : 
                  profitPercent >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                } text-white`}
              >
                {formatNumber(profitPercent, 1)}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
