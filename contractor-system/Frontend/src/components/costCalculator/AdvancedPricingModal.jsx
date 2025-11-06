
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Trash2, Calculator, X, Layers, TrendingUp, ListChecks, Settings, HelpCircle, Zap, BarChart, Lightbulb } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define tierColors for visual representation
const tierColors = [
    { bg: 'bg-emerald-200', text: 'text-emerald-900', border: 'border-emerald-300', lightBg: 'bg-emerald-50' },
    { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-300', lightBg: 'bg-blue-50' },
    { bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-300', lightBg: 'bg-purple-50' },
    { bg: 'bg-pink-200', text: 'text-pink-900', border: 'border-pink-300', lightBg: 'bg-pink-50' },
    { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-300', lightBg: 'bg-orange-50' },
    { bg: 'bg-red-200', text: 'text-red-900', border: 'border-red-300', lightBg: 'bg-red-50' },
    { bg: 'bg-lime-200', text: 'text-lime-900', border: 'border-lime-300', lightBg: 'bg-lime-50' },
    { bg: 'bg-cyan-200', text: 'text-cyan-900', border: 'border-cyan-300', lightBg: 'bg-cyan-50' },
    { bg: 'bg-indigo-200', text: 'text-indigo-900', border: 'border-indigo-300', lightBg: 'bg-indigo-50' },
];

// Update the getProfitBadgeClass function to remove background styling
const getProfitBadgeClass = (percent) => {
  if (isNaN(percent)) return "text-gray-800";
  if (percent >= 30) return "text-green-800";
  if (percent >= 15) return "text-blue-800";
  if (percent > 0) return "text-yellow-800";
  return "text-red-800";
};

export default function AdvancedPricingModal({ 
  isOpen, 
  onClose, 
  formData, 
  onSave,
  calculateMetrics 
}) {
  const [localData, setLocalData] = useState({
    priceTiers: [{ minArea: 0, maxArea: '', price: '' }],
    maxProjectRange: '',
    desiredProfitPercent: '',
  });
  const [selectedTierCount, setSelectedTierCount] = useState(null);
  const [tierSummary, setTierSummary] = useState({
    avgPrice: 0,
    avgCost: 0,
    avgProfit: 0,
    avgProfitPercent: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setLocalData({
        priceTiers: formData.priceTiers && formData.priceTiers.length > 0 ? JSON.parse(JSON.stringify(formData.priceTiers)) : [{ minArea: 0, maxArea: 0, price: '' }],
        maxProjectRange: formData.maxProjectRange || '',
        desiredProfitPercent: formData.desiredProfitPercent || '',
      });
      setSelectedTierCount(null);
    }
  }, [isOpen, formData]);

  useEffect(() => {
    const tiers = localData.priceTiers;
    if (!tiers || tiers.length === 0 || tiers.every(t => !t.maxArea || !t.price)) {
        setTierSummary({ avgPrice: 0, avgCost: 0, avgProfit: 0, avgProfitPercent: 0 });
        return;
    }

    let totalWeightedPrice = 0;
    let totalWeightedCost = 0;
    let totalArea = 0;

    tiers.forEach(tier => {
        const currentMaxArea = Number(tier.maxArea);
        const currentMinArea = Number(tier.minArea);

        if (isNaN(currentMaxArea) || currentMaxArea <= 0 || isNaN(currentMinArea) || currentMaxArea < currentMinArea) {
            return;
        }
        
        const tierArea = currentMaxArea - currentMinArea; 

        const tierPrice = Number(tier.price);

        if (tierArea > 0 && !isNaN(tierPrice) && tierPrice > 0) {
            const metrics = calculateMetrics(currentMaxArea, formData, tierPrice);
            totalWeightedPrice += tierPrice * tierArea;
            totalWeightedCost += (metrics.costPerMeter || 0) * tierArea;
            totalArea += tierArea;
        }
    });

    if (totalArea > 0) {
        const avgPrice = totalWeightedPrice / totalArea;
        const avgCost = totalWeightedCost / totalArea;
        const avgProfit = avgPrice - avgCost;
        const avgProfitPercent = avgCost > 0 ? (avgProfit / avgCost) * 100 : 0;
        
        setTierSummary({
            avgPrice,
            avgCost,
            avgProfit,
            avgProfitPercent,
        });
    } else {
        setTierSummary({ avgPrice: 0, avgCost: 0, avgProfit: 0, avgProfitPercent: 0 });
    }
  }, [localData.priceTiers, formData, calculateMetrics]);

  const handleTierChange = (index, field, value) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
        return;
    }

    const newTiers = [...localData.priceTiers];
    newTiers[index][field] = value;

    if (field === 'maxArea' && index < newTiers.length - 1) {
      newTiers[index + 1].minArea = (Number(value) || 0) + 1;
    }

    setLocalData(prev => ({ ...prev, priceTiers: newTiers }));
    setSelectedTierCount(null);
  };

  const addTier = (index) => {
    const lastTier = localData.priceTiers[index];
    const newTier = { 
      minArea: (Number(lastTier?.maxArea) || 0) + 1, 
      maxArea: '',
      price: ''
    };
    
    const newTiers = [...localData.priceTiers];
    newTiers.splice(index + 1, 0, newTier);
    setLocalData(prev => ({ ...prev, priceTiers: newTiers }));
    setSelectedTierCount(null);
  };

  const removeTier = (index) => {
    if (localData.priceTiers.length <= 1) return;
    const newTiers = localData.priceTiers.filter((_, i) => i !== index);
    
    if (index > 0 && index < newTiers.length) {
      newTiers[index].minArea = (Number(newTiers[index - 1].maxArea) || 0) + 1;
    } else if (index === 0 && newTiers.length > 0) {
      newTiers[0].minArea = 0;
    }
    
    setLocalData(prev => ({ ...prev, priceTiers: newTiers }));
    setSelectedTierCount(null);
  };

  const handleTierDistribution = (numberOfTiers) => {
    const maxRange = Number(localData.maxProjectRange);
    if (!maxRange || maxRange <= 0 || !numberOfTiers || numberOfTiers <= 0) {
      alert('נא להזין טווח פרויקט מקסימלי ומספר מדרגות תקינים');
      return;
    }

    let newTiers = [];
    const tierSize = Math.floor(maxRange / numberOfTiers);

    for (let i = 0; i < numberOfTiers; i++) {
      let minArea = i === 0 ? 0 : (newTiers[i-1].maxArea + 1);
      let maxArea;
      if (i === numberOfTiers - 1) {
        maxArea = maxRange;
      } else {
        maxArea = (i + 1) * tierSize;
      }
      
      newTiers.push({
        minArea: minArea,
        maxArea: maxArea,
        price: 0
      });
    }

    if (newTiers.length > 0) {
      newTiers[newTiers.length - 1].maxArea = maxRange;
    }
    
    setLocalData(prev => ({ ...prev, priceTiers: newTiers }));
    setSelectedTierCount(numberOfTiers);
  };
  
  const handleMaxRangeChange = (value) => {
      setLocalData(prev => ({ ...prev, maxProjectRange: value }));
      setSelectedTierCount(null);
  };

  const calculateRangesForDisplay = useCallback((maxRange, tierCount) => {
    if (isNaN(maxRange) || maxRange <= 0 || isNaN(tierCount) || tierCount <= 0) return [];
    const ranges = [];
    const tierSize = Math.floor(maxRange / tierCount);

    for (let i = 0; i < tierCount; i++) {
        let minArea = i === 0 ? 0 : (ranges[i-1].maxArea + 1);
        let maxArea;
        if (i === tierCount - 1) {
            maxArea = maxRange;
        } else {
            maxArea = (i + 1) * tierSize;
        }
        
        ranges.push({
            minArea: minArea,
            maxArea: maxArea,
        });
    }

    if (ranges.length > 0) {
      ranges[ranges.length - 1].maxArea = maxRange;
    }
    
    return ranges;
  }, []);

  const handleSave = () => {
    onSave({
      priceTiers: localData.priceTiers,
      maxProjectRange: localData.maxProjectRange,
      desiredProfitPercent: localData.desiredProfitPercent,
    });
    onClose();
  };

  const handleCancel = () => {
    setLocalData({
      priceTiers: formData.priceTiers && formData.priceTiers.length > 0 ? JSON.parse(JSON.stringify(formData.priceTiers)) : [{ minArea: 0, maxArea: '', price: '' }],
      maxProjectRange: formData.maxProjectRange || '',
      desiredProfitPercent: formData.desiredProfitPercent || '',
    });
    onClose();
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const rangesForDisplay = useMemo(() => {
    return calculateRangesForDisplay(Number(localData.maxProjectRange), selectedTierCount);
  }, [localData.maxProjectRange, selectedTierCount, calculateRangesForDisplay]);

  const allTiersMetrics = useMemo(() => {
    return localData.priceTiers.map(tier => 
      calculateMetrics(Number(tier.maxArea) || 0, formData, Number(tier.price) || 0)
    );
  }, [localData.priceTiers, formData, calculateMetrics]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">הגדרות תמחור מתקדמות</DialogTitle>
          <DialogDescription>
            קבע מדרגות מחיר מרובות כדי לתמחר פרויקטים בגדלים שונים בצורה מדויקת יותר.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-6">
            
            {/* בלוק חיסכון בזמן - למעלה על כל רוחב המסך */}
            <div>
              <h3 className="text-xl font-bold text-gray-700">הגדרה מהירה</h3>
              <Card className="border-2 border-gray-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 text-gray-800">
                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    חיסכון בזמן: הגדרת מדרגות אוטומטית
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    אם ברצונך שהמערכת תבנה עבורך את מדרגות המחיר באופן מיידי, הגדר את הטווח המקסימלי (במ"ר) ואת מספר המדרגות. טווחי המחיר יחושבו שווה בשווה.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="maxRange" className="font-semibold text-gray-700 mb-2 block">טווח מקסימלי (מ"ר)</Label>
                      <Input
                        id="maxRange"
                        type="number"
                        value={localData.maxProjectRange}
                        onChange={(e) => handleMaxRangeChange(e.target.value)}
                        placeholder="לדוגמה: 200"
                        className="w-full h-12 text-lg text-center font-bold bg-white border-gray-300 focus:border-indigo-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="automaticTierCount" className="font-semibold text-gray-700 mb-2 block">מספר מדרגות</Label>
                      <Select onValueChange={(value) => handleTierDistribution(Number(value))}>
                        <SelectTrigger className="w-full h-12 bg-white border-gray-300 focus:border-indigo-500 text-base justify-end">
                          {selectedTierCount > 0 ? (
                            <div className="flex items-center gap-2 font-bold">
                              <Layers className="w-4 h-4 text-indigo-400" />
                              <span>מדרגות</span>
                              <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full text-sm">
                                {selectedTierCount}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">בחר לחלוקה אוטומטית</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(9)].map((_, i) => {
                            const count = i + 2;
                            return (
                              <SelectItem key={count} value={String(count)} className="text-right justify-end">
                                <span className="font-bold">{count} מדרגות</span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedTierCount > 0 && rangesForDisplay.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-3 text-right">חלוקה אוטומטית שהוגדרה:</h4>
                      <div className="flex flex-wrap-reverse gap-2 justify-end">
                        {rangesForDisplay.map((tier, index) => (
                          <div
                            key={index}
                            className={`px-4 py-2 rounded-full text-white font-bold text-sm ${tierColors[index % tierColors.length].bg}`}
                          >
                            {tier.minArea} - {tier.maxArea} מ"ר
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 text-right">
                      <span className="font-bold">טיפ:</span>
                      לאחר יצירת המדרגות באופן אוטומטי, תוכל לערוך כל מדרגה בנפרד ולהתאים את המחירים.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* בלוק המדרגות המותאמות אישית - למטה על כל רוחב המסך */}
            <div>
              <h3 className="text-xl font-bold text-gray-700">מדרגות מחיר מותאמות אישית</h3>
              
              <div className="space-y-3">
                {localData.priceTiers.map((tier, index) => (
                  <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">מדרגה</span>
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-sm ${tierColors[index % tierColors.length].bg}`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {tier.minArea} עד {tier.maxArea || '∞'} מ"ר
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs font-medium text-gray-600 mb-1 block">טווח עד (מ"ר)</Label>
                        <Input
                          type="number"
                          value={tier.maxArea}
                          onChange={(e) => handleTierChange(index, 'maxArea', e.target.value)}
                          placeholder="20"
                          className="h-9 text-sm bg-white border-gray-300 focus:border-indigo-500"
                          min={(Number(tier.minArea) || 0) + 1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-600 mb-1 block">מחיר למ"ר</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={tier.price}
                            onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm bg-white border-gray-300 focus:border-indigo-500 pr-8"
                            min="0"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">₪</span>
                        </div>
                      </div>
                    </div>

                    {/* Updated grid with 4 columns */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className={`p-2 rounded-lg text-center bg-green-50`}>
                        <p className="text-xs font-semibold text-gray-700 mb-1">רווח כולל</p>
                        <p className={`text-lg font-bold text-green-700`}>
                          ₪ {formatPrice(allTiersMetrics[index]?.profit || 0)}
                        </p>
                        <p className={`text-xs font-medium ${getProfitBadgeClass(allTiersMetrics[index]?.profitPercentage)}`}>
                          {(allTiersMetrics[index]?.profitPercentage || 0).toFixed(1)}%
                        </p>
                        <div className="border-t border-gray-300 mt-1 pt-1">
                          <p className="text-xs text-gray-600">רווח למ"ר</p>
                          <p className={`text-sm font-bold text-green-700`}>
                            ₪ {((allTiersMetrics[index]?.profit || 0) / (Number(tier.maxArea) || 1)).toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 bg-blue-50 rounded-lg text-center">
                        <p className="text-xs font-semibold text-blue-800 mb-1">עלות כוללת לקבלן</p>
                        <p className="text-lg font-bold text-blue-600">
                          ₪ {formatPrice(allTiersMetrics[index]?.totalCost || 0)}
                        </p>
                        <div className="border-t border-blue-200 mt-1 pt-1">
                          <p className="text-xs text-blue-700">עלות למ"ר</p>
                          <p className="text-sm font-bold text-blue-800">
                            ₪ {(allTiersMetrics[index]?.costPerMeter || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>

                      {/* New 'מחיר ללקוח כולל' card */}
                      <div className="p-2 bg-purple-50 rounded-lg text-center">
                        <p className="text-xs font-semibold text-purple-800 mb-1">מחיר ללקוח כולל</p>
                        <p className="text-lg font-bold text-purple-600">
                          ₪ {(Number(allTiersMetrics[index]?.sellingPrice) || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <div className="border-t border-purple-200 mt-1 pt-1">
                          <p className="text-xs text-purple-700">מחיר למ"ר</p>
                          <p className="text-sm font-bold text-purple-800">
                            ₪ {(Number(tier.price) || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 bg-orange-50 rounded-lg text-center">
                        <p className="text-xs font-semibold text-orange-800 mb-1">פירוט עלויות</p>
                        <p className="text-lg font-bold text-orange-600">
                          {(allTiersMetrics[index]?.workDays || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-orange-700 mb-1">ימי עבודה</p>
                        <div className="space-y-0.5 text-xs text-right">
                          <p className="flex justify-between items-center">
                            <span>חומרים:</span> 
                            <span className="font-bold">₪ {formatPrice(allTiersMetrics[index]?.materialCost || 0)}</span>
                          </p>
                          <p className="flex justify-between items-center">
                            <span>עבודה:</span>
                            <span className="font-bold">₪ {formatPrice(allTiersMetrics[index]?.laborCost || 0)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  onClick={() => addTier(localData.priceTiers.length - 1)}
                  variant="outline"
                  className="bg-white border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף מדרגה נוספת
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          
          {/* Tier Summary Block */}
          <div className="mt-6">
            <Card className="bg-teal-50 border-2 border-teal-200 shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-teal-800">
                        <BarChart className="w-5 h-5" />
                        סיכום ממוצעים (לפי מדרגות)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-teal-700 font-semibold">מחיר ממוצע למ"ר</p>
                            <p className="text-2xl font-bold text-teal-900">{formatPrice(tierSummary.avgPrice)} ₪</p>
                        </div>
                        <div>
                            <p className="text-sm text-teal-700 font-semibold">עלות ממוצעת למ"ר</p>
                            <p className="text-2xl font-bold text-teal-900">{formatPrice(tierSummary.avgCost)} ₪</p>
                        </div>
                        <div>
                            <p className="text-sm text-teal-700 font-semibold">רווח ממוצע למ"ר</p>
                            <p className={`text-2xl font-bold ${tierSummary.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(tierSummary.avgProfit)} ₪</p>
                        </div>
                        <div>
                            <p className="text-sm text-teal-700 font-semibold">אחוז רווח ממוצע</p>
                            <p className={`text-2xl font-bold ${tierSummary.avgProfitPercent >= 20 ? 'text-green-600' : 'text-amber-600'}`}>{tierSummary.avgProfitPercent.toFixed(1)}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>

        </div>

        {/* Dialog footer */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="text-gray-600 border-gray-300">
                    הקודם
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                    ביטול
                </Button>
            </div>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white px-6 shadow-lg">
                <Save className="h-4 w-4 ml-2" />
                שמור מדרגות מחיר
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
