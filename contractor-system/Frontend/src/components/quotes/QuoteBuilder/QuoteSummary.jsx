
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DollarSign, Percent, TrendingUp, Users, Trash2, ChevronDown, ChevronUp, AlertTriangle, Package, TrendingDown, Calculator, Calendar, Banknote } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addDays, eachDayOfInterval, startOfDay, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatPrice } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const getProfitBadgeClass = (percent) => {
    if (isNaN(percent)) return "bg-gray-100 text-gray-800";
    if (percent >= 30) return "bg-green-100 text-green-800 border border-green-200";
    if (percent >= 15) return "bg-blue-100 text-blue-800 border border-blue-200";
    if (percent > 0) return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    return "bg-red-100 text-red-800 border border-red-200";
};

const DataRow = ({ label, value, icon, className = '' }) => {
    const Icon = icon;
    return (
        <div className={`flex justify-between items-center py-3 ${className}`}>
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-gray-500" />}
                <span className="text-sm text-gray-600">{label}</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{value}</span>
        </div>
    );
};

const ItemsReview = ({ items, onRemoveItem, title }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!items || items.length === 0) return null;

    const total = items.reduce((sum, item) => sum + (item.cost || item.totalPrice || 0), 0);

    return (
        <div className="border rounded-lg bg-gray-50/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 text-sm font-medium text-left"
            >
                <span>{title} ({items.length})</span>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">{formatPrice(total)} ₪</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>
            {isOpen && (
                <div className="p-3 border-t">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {items.map((item, index) => (
                            <div key={item.id || index} className="flex justify-between items-center text-xs p-1.5 rounded bg-white">
                                <span className="text-gray-600 flex-1 truncate">{item.description}</span>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-gray-800">{formatPrice(item.cost || item.totalPrice || 0)} ₪</span>
                                    {onRemoveItem && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => onRemoveItem(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Project Cash Flow Chart Component - FIXED VERSION
const ProjectCashFlowChart = ({ paymentTerms = [], finalAmount = 0, selectedItems = [], categoryTimings = {} }) => {
    // Calculate the project duration dynamically
    const projectStartDate = startOfDay(new Date());
    let projectEndDate = addDays(projectStartDate, 30); // default 30 days

    // Find the actual project end date from category timings
    Object.values(categoryTimings).forEach(timing => {
        if (timing.endDate) {
            const categoryEndDate = new Date(timing.endDate);
            if (categoryEndDate > projectEndDate) {
                projectEndDate = categoryEndDate;
            }
        }
    });

    // Generate data points for each day of the project
    const chartData = [];
    const allDays = eachDayOfInterval({ start: projectStartDate, end: projectEndDate });
    
    allDays.forEach(currentDate => {
        const dateStr = format(currentDate, 'dd/MM');
        
        let dayIncome = 0;
        let dayExpenses = 0;
        
        // Calculate income from payment terms
        paymentTerms.forEach((term, index) => {
            let paymentDate;
            const paymentAmount = (finalAmount * term.percentage) / 100;
            
            // Calculate payment dates based on project timeline
            if (index === 0) {
                // First payment - project start
                paymentDate = projectStartDate;
            } else if (index === paymentTerms.length - 1) {
                // Last payment - project end
                paymentDate = projectEndDate;
            } else {
                // Middle payments - distributed proportionally
                const totalDays = Math.ceil((projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24));
                const daysGap = Math.floor((totalDays * index) / (paymentTerms.length - 1));
                paymentDate = addDays(projectStartDate, daysGap);
            }
            
            // Check if payment is due on this date
            if (format(paymentDate, 'dd/MM') === dateStr) {
                dayIncome += paymentAmount;
            }
        });
        
        // Calculate expenses - FIXED: Only on category START date
        Object.entries(categoryTimings).forEach(([categoryId, timing]) => {
            if (timing.startDate) {
                const categoryStartDate = new Date(timing.startDate);
                
                // Check if today is the START date of this category
                if (format(categoryStartDate, 'dd/MM') === dateStr) {
                    // Add ALL expenses for this category on the start date
                    const categoryItems = selectedItems.filter(item => item.categoryId === categoryId);
                    const categoryTotalCost = categoryItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
                    dayExpenses += categoryTotalCost;
                }
            }
        });
        
        chartData.push({
            date: dateStr,
            income: Math.round(dayIncome),
            expenses: Math.round(dayExpenses)
        });
    });
    
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-800 mb-2">{`תאריך: ${label}`}</p>
                    {payload.map((p, i) => (
                        <p key={i} className="text-sm" style={{ color: p.color }}>
                            {`${p.name}: ${formatPrice(p.value)} ₪`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };
    
    // Calculate totals for summary
    const totalIncome = chartData.reduce((sum, day) => sum + day.income, 0);
    const totalExpenses = chartData.reduce((sum, day) => sum + day.expenses, 0);
    const netFlow = totalIncome - totalExpenses;
    
    return (
        <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    תזרים לאורך הפרויקט
                </CardTitle>
                <p className="text-sm text-gray-600">תחזית הכנסות והוצאות על בסיס תנאי התשלום ולוחות זמנים של הקטגוריות</p>
            </CardHeader>
            <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Banknote className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">סה״כ הכנסות צפויות</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-800">
                            {formatPrice(totalIncome)} ₪
                        </div>
                    </div>
                    
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            <span className="text-sm font-medium text-red-700">סה״כ הוצאות צפויות</span>
                        </div>
                        <div className="text-2xl font-bold text-red-800">
                            {formatPrice(totalExpenses)} ₪
                        </div>
                    </div>
                    
                    <div className={`${netFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border-2 rounded-lg p-4 text-center`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <DollarSign className={`h-5 w-5 ${netFlow >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                            <span className={`text-sm font-medium ${netFlow >= 0 ? 'text-green-700' : 'text-orange-700'}`}>תזרים נטו</span>
                        </div>
                        <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                            {formatPrice(netFlow)} ₪
                        </div>
                    </div>
                </div>
                
                {/* Chart */}
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis 
                                tick={{ fontSize: 12 }} 
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="income" 
                                name="הכנסות" 
                                stroke="#10b981" 
                                strokeWidth={3} 
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} 
                                activeDot={{ r: 6 }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="expenses" 
                                name="הוצאות" 
                                stroke="#ef4444" 
                                strokeWidth={3} 
                                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} 
                                activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

const isManualCalcItem = (item) =>
  item && item.source === "manual_calc" && (item.manualFormSnapshot || item.manualMeta);

const extractManualParts = (item) => {
  const snap = item?.manualFormSnapshot || item?.manualMeta || {};
  const wallsEnabled = Boolean(
    (snap?.walls?.enabled) ??
    snap?.wallsEnabled ??
    (Number(snap?.walls?.area ?? snap?.wallsArea) > 0)
  );
  const ceilingEnabled = Boolean(
    (snap?.ceiling?.enabled) ??
    snap?.ceilingEnabled ??
    (Number(snap?.ceiling?.area ?? snap?.ceilingArea) > 0)
  );

  const walls = {
    enabled: wallsEnabled,
    area: Number(snap?.walls?.area ?? snap?.wallsArea ?? 0) || 0,
    type: (snap?.walls?.manualType ?? snap?.wallsType ?? snap?.manualTypeWalls ?? snap?.manualType ?? ""),
    layers: Number(snap?.walls?.layers ?? snap?.wallsLayers ?? 0) || 0,
    label: "קירות",
  };

  const ceiling = {
    enabled: ceilingEnabled,
    area: Number(snap?.ceiling?.area ?? snap?.ceilingArea ?? 0) || 0,
    type: (snap?.ceiling?.manualType ?? snap?.ceilingType ?? snap?.manualTypeCeiling ?? ""),
    layers: Number(snap?.ceiling?.layers ?? snap?.ceilingLayers ?? 0) || 0,
    label: "תקרה",
  };

  const totalPrice = Number(item?.totalPrice) || 0;
  const totalArea = (walls.enabled ? walls.area : 0) + (ceiling.enabled ? ceiling.area : 0);
  if (totalArea > 0) {
    walls.price = walls.enabled ? Math.round(totalPrice * (walls.area / totalArea)) : 0;
    ceiling.price = ceiling.enabled ? (totalPrice - walls.price) : 0;
  } else {
    if (walls.enabled && !ceiling.enabled) {
      walls.price = totalPrice; ceiling.price = 0;
    } else if (!walls.enabled && ceiling.enabled) {
      walls.price = 0; ceiling.price = totalPrice;
    } else { // Neither walls nor ceiling enabled/have area, or both zero
      walls.price = 0; ceiling.price = 0;
    }
  }
  return { walls, ceiling, totalPrice, description: (snap?.description || "").trim() };
};

export default function QuoteSummary({
    selectedItems = [],
    projectComplexities = {},
    discount,
    onUpdateDiscount,
    priceIncrease = 0,
    onUpdatePriceIncrease,
    categoryTimings,
    onRemoveItem,
    paymentTerms = []
}) {
    const [isQuantitiesCostsOpen, setIsQuantitiesCostsOpen] = useState(false);
    const [isCashFlowOpen, setIsCashFlowOpen] = useState(false);

    const calculateWorkingDays = (startDate, endDate) => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        let workingDays = 0;
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }
        return workingDays;
    };

    // סיכום קטגוריה
    const categoryId = 'cat_demolition'; // Assuming 'cat_demolition' is the categoryId for demolition items
    const demolitionItems = (selectedItems || []).filter((it) => it.categoryId === categoryId);
    const summary = demolitionItems.reduce(
        (acc, it) => {
            const price = Number(it.totalPrice) || 0;
            const cost = Number(it.totalCost) || 0;
            const workDays = Number(it.workDuration) || 0;
            acc.price += price;
            acc.cost += cost;
            acc.profit += (price - cost);
            acc.workDays += workDays;
            return acc;
        },
        { price: 0, cost: 0, profit: 0, workDays: 0 }
    );
    
    const exactWorkDays = summary.workDays;
    const roundedWorkDays = Math.ceil(summary.workDays);
    const roundingDifference = roundedWorkDays - exactWorkDays;
    
    // בדיקה אם כבר בוצע עיגול (יש פריטים עם תוספת עיגול)
    const hasRoundingApplied = demolitionItems.some(it => (Number(it.demolitionRoundingShareWorkDays) || 0) > 0);
    
    // אם כבר בוצע עיגול, לא צריך להציע עיגול נוסף
    const needsRounding = !hasRoundingApplied && roundingDifference > 0.01 && exactWorkDays > 0;
    
    // NEW: Calculate itemsCount - sum quantities for "יחידה" items, count 1 for others
    const itemsCount = demolitionItems.reduce((sum, it) => {
        if (it.unit === "יחידה") {
            return sum + (Number(it.quantity) || 1);
        }
        return sum + 1;
    }, 0);

    const subtotalItems = selectedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const projectAdditionalCosts = (projectComplexities?.additionalCostDetails || []).reduce((sum, cost) => sum + (cost.cost || 0), 0);
    const finalSubtotal = subtotalItems + projectAdditionalCosts;
    
    const subtotalAfterIncrease = finalSubtotal + (finalSubtotal * priceIncrease) / 100;
    const discountAmount = (subtotalAfterIncrease * discount) / 100;
    const total = subtotalAfterIncrease - discountAmount;

    const totalItemsCost = selectedItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const totalContractorAdditionalCosts = (projectComplexities?.additionalCostDetails || []).reduce((sum, cost) => sum + (cost.contractorCost || cost.cost || 0), 0);
    const contractorComplexitySum = selectedItems.reduce((sum, it) => {
        return sum + (Number(it.complexityLaborAddedCost) || 0);
    }, 0);
    const totalContractorCost = totalItemsCost + totalContractorAdditionalCosts + contractorComplexitySum;
    
    const profit = total - totalContractorCost;
    const profitPercent = totalContractorCost > 0 ? (profit / totalContractorCost * 100) : (total > 0 ? 100 : 0);
    
    const totalWorkDays = selectedItems.reduce((sum, item) => {
        const workDuration = Number(item.workDuration) || 0;
        return sum + workDuration;
    }, 0);

    const complexityExtraHours = selectedItems.reduce((sum, it) => {
        return sum + (Number(it.complexityHoursAdded) || 0);
    }, 0);
    
    const workforceData = Object.entries(categoryTimings || {})
        .map(([categoryId, timings]) => {
            if (!timings || !timings.startDate || !timings.endDate) return null;
            const categoryItems = selectedItems.filter(item => item.categoryId === categoryId);
            if (categoryItems.length === 0) return null;
            
            const totalWorkDaysNeeded = categoryItems.reduce((sum, item) => {
                const workDuration = Number(item.workDuration) || 0;
                return sum + workDuration;
            }, 0);
            
            const availableWorkDays = calculateWorkingDays(timings.startDate, timings.endDate);
            const workersNeeded = availableWorkDays > 0 ? Math.ceil(totalWorkDaysNeeded / availableWorkDays) : 0;
            return workersNeeded;
        })
        .filter(Boolean);
    const totalWorkersNeeded = workforceData.reduce((sum, count) => sum + (Number(count) || 0), 0);

    const isLowProfit = profitPercent < 30;

    const allMaterialCosts = selectedItems.reduce((sum, item) => sum + (Number(item.materialCost) || 0), 0);
    const allLaborCosts = selectedItems.reduce((sum, item) => sum + (Number(item.laborCost) || 0), 0);

    const materialBreakdown = selectedItems.reduce((acc, item) => {
        const categoryId = item.categoryId || 'other';
        const categoryName = item.categoryName || `קטגוריה ${categoryId.replace('cat_', '')}`;
        
        if (!acc[categoryId]) {
            acc[categoryId] = {
                categoryName: categoryName,
                totalMaterialCost: 0,
                items: []
            };
        }
        acc[categoryId].totalMaterialCost += (Number(item.materialCost) || 0);

        let quantityDisplay = item.quantity;
        let unitDisplay = item.unit;

        if (item.source === 'paint_plaster_category_summary' && item.totalBucketsNeeded !== undefined) {
            const bucketsNeeded = Number(item.totalBucketsNeeded) || 0;
            quantityDisplay = bucketsNeeded.toFixed(1);
            unitDisplay = 'דליים';
        }

        acc[categoryId].items.push({
            name: item.description || item.name,
            quantity: quantityDisplay,
            unit: unitDisplay,
            materialCost: Number(item.materialCost) || 0
        });
        return acc;
    }, {});

    const laborBreakdown = selectedItems.reduce((acc, item) => {
        const categoryId = item.categoryId || 'other';
        const categoryName = item.categoryName || `קטגוריה ${categoryId.replace('cat_', '')}`;
        if (!acc[categoryId]) {
            acc[categoryId] = {
                categoryName: categoryName,
                totalLaborCost: 0
            };
        }
        acc[categoryId].totalLaborCost += (Number(item.laborCost) || 0);
        return acc;
    }, {});

    // NEW: Build per-room complexity summary for paint items (if exists)
    const paintComplexityRooms = useMemo(() => {
        const rooms = [];
        selectedItems
            .filter(it => it.categoryId === 'cat_paint_plaster' && Array.isArray(it.detailedBreakdown))
            .forEach(it => {
                it.detailedBreakdown.forEach((r, idx) => {
                    const label = r?.difficultyData?.label || r?.difficultyLevel || null;
                    const factor = r?.difficultyData?.factor ?? null;
                    if (label || factor) {
                        rooms.push({
                            itemDescription: it.description || it.name || 'צבע',
                            roomName: r.name || r.roomName || `חלל ${idx + 1}`,
                            label: label || '',
                            factor: factor || null,
                            wallArea: Number(r.wallArea ?? r.wallsArea ?? 0) || 0,
                            ceilingArea: Number(r.ceilingArea ?? 0) || 0,
                        });
                    }
                });
            });
        return rooms;
    }, [selectedItems]);

    // ADD: build manual paint/plaster rows for stage 5 table
    const manualPaintItems = (selectedItems || []).filter(
      it => it.categoryId === 'cat_paint_plaster' && isManualCalcItem(it)
    );

    return (
        <div className="space-y-6">

            {/* Client-Side Calculation - Full Width */}
            <div className="pt-6 border-t">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800">חישוב מחיר ללקוח</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DataRow label="סהכ עלות פריטים" value={`${formatPrice(subtotalItems)} ₪`} />
                        <DataRow label="תוספות ועלויות פרויקט" value={`${formatPrice(projectAdditionalCosts)} ₪`} />
                        <Separator />
                        <DataRow label="סהכ לפני התאמות" value={`${formatPrice(finalSubtotal)} ₪`} className="font-bold" />
                        
                        {/* העלאת מחיר */}
                        <div className="flex justify-between items-center py-3">
                            <Label htmlFor="priceIncrease" className="text-sm text-gray-600 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-gray-500" />
                                העלאת מחיר (%)
                            </Label>
                            <div className="flex items-center gap-2 w-1/2">
                                <Input
                                    id="priceIncrease"
                                    type="number"
                                    value={priceIncrease}
                                    onChange={(e) => onUpdatePriceIncrease && onUpdatePriceIncrease(Number(e.target.value))}
                                    className="w-20 text-center font-medium"
                                    placeholder="0"
                                />
                                <span className="text-sm text-green-600 w-24 text-right">
                                    (+{formatPrice((finalSubtotal * priceIncrease) / 100)} ₪)
                                </span>
                            </div>
                        </div>

                        {/* הנחה */}
                        <div className="flex justify-between items-center py-3">
                            <Label htmlFor="discount" className="text-sm text-gray-600 flex items-center gap-2">
                                <Percent className="h-4 w-4 text-gray-500" />
                                הנחה (%)
                            </Label>
                            <div className="flex items-center gap-2 w-1/2">
                                <Input
                                    id="discount"
                                    type="number"
                                    value={discount}
                                    onChange={(e) => onUpdateDiscount(Number(e.target.value))}
                                    className="w-20 text-center font-medium"
                                    placeholder="0"
                                />
                                <span className="text-sm text-red-600 w-24 text-right">(-{formatPrice(discountAmount)} ₪)</span>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="text-base font-bold text-blue-800">סה"כ לתשלום</span>
                            <span className="text-xl font-bold text-blue-700">{formatPrice(total)} ₪</span>
                        </div>

                        {/* Low Profit Warning */}
                        {isLowProfit && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm font-medium">רווח נמוך מ-30%!</span>
                                </div>
                                <p className="text-xs text-red-600 mt-1">
                                    עדיף לשקול העלאת המחיר ללקוח להבטחת רווחיות טובה יותר
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* NEW: Yellow box – complexity for contractor and hours summary */}
            {(contractorComplexitySum > 0 || complexityExtraHours > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm font-medium text-yellow-800">מורכבות – סיכום</div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="text-yellow-800">
                      תוספת מורכבות לקבלן: <span className="font-semibold">{formatPrice(contractorComplexitySum)} ₪</span>
                    </div>
                    <div className="text-yellow-800">
                      שעות עבודה נוספות: <span className="font-semibold">{complexityExtraHours}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Big Numbers Footer */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center pt-6 border-t">
                <Card className="bg-red-50 border-red-200 shadow-sm">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base font-semibold text-red-800">עלות כוללת לקבלן</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-4xl font-bold text-red-700 tracking-tight">{formatPrice(totalContractorCost)} ₪</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200 shadow-sm">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base font-semibold text-green-800">רווח צפוי (קבלן)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-4xl font-bold text-green-700 tracking-tight">{formatPrice(profit)} ₪</p>
                        <p className="text-sm font-semibold text-green-600 mt-1">({profitPercent.toFixed(1)}%)</p>
                    </CardContent>
                </Card>
                 <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base font-semibold text-blue-800">מחיר סופי ללקוח</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-4xl font-bold text-blue-700 tracking-tight">{formatPrice(total)} ₪</p>
                    </CardContent>
                </Card>
            </div>

            {/* ADD: Manual paint/plaster details block inside step 5 summary */}
            {manualPaintItems.length > 0 && (
                <div className="mt-6 border rounded-lg p-4 bg-white" dir="rtl">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800">פירוט ידני — צבע ושפכטל</h3>
                    </div>

                    <div className="space-y-3">
                        {manualPaintItems.map((item) => {
                            const { walls, ceiling, totalPrice, description } = extractManualParts(item);
                            return (
                                <div key={item.id} className="rounded-md border p-3">
                                    {/* כותרת הפריט - רק תיאור משתמש אם קיים */}
                                    {description ? (
                                        <div className="text-sm font-medium text-gray-800 mb-2">{description}</div>
                                    ) : null}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        {walls.enabled && (
                                            <div className="flex items-center justify-between rounded bg-gray-50 p-2">
                                                <div className="text-gray-700">
                                                    <div className="font-semibold">קירות</div>
                                                    <div className="text-gray-600">
                                                        סוג: {walls.type || '—'} • שכבות: {walls.layers || 0} • כמות: {walls.area || 0} מ״ר
                                                    </div>
                                                </div>
                                                <div className="font-bold text-gray-900">₪ {Number(walls.price || 0).toLocaleString('he-IL')}</div>
                                            </div>
                                        )}
                                        {ceiling.enabled && (
                                            <div className="flex items-center justify-between rounded bg-gray-50 p-2">
                                                <div className="text-gray-700">
                                                    <div className="font-semibold">תקרה</div>
                                                    <div className="text-gray-600">
                                                        סוג: {ceiling.type || '—'} • שכבות: {ceiling.layers || 0} • כמות: {ceiling.area || 0} מ״ר
                                                    </div>
                                                </div>
                                                <div className="font-bold text-gray-900">₪ {Number(ceiling.price || 0).toLocaleString('he-IL')}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end mt-3 text-sm">
                                        <span className="text-gray-600 ml-2">מחיר כולל:</span>
                                        <span className="font-bold text-gray-900">₪ {Number(totalPrice).toLocaleString('he-IL')}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* NEW: Tiling Panel Summary - show detailed breakdown when items have panel work */}
            {(() => {
                const tilingItems = selectedItems.filter(it => it.categoryId === 'cat_tiling');
                const tilingItemsWithPanel = tilingItems.filter(it => Number(it.panelQuantity || 0) > 0);

                if (tilingItemsWithPanel.length === 0) return null;

                return (
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-orange-50/80 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Package className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">פירוט ריצוף וחיפוי — עם פאנל</h3>
                                    <p className="text-sm text-gray-600">פריטים שכוללים עבודת פאנל נוסף לריצוף הרגיל</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            {tilingItemsWithPanel.map((item, i) => {
                                const quantity = Number(item.quantity || 0);
                                const panelQuantity = Number(item.panelQuantity || 0);
                                const quantityWorkDays = Number(item.quantityWorkDays || 0);
                                const panelWorkDays = Number(item.panelWorkDays || 0);
                                const quantityLaborCost = Number(item.quantityLaborCost || 0);
                                const panelLaborCost = Number(item.panelLaborCost || 0);
                                const totalArea = quantity + panelQuantity;
                                const totalWorkDays = quantityWorkDays + panelWorkDays;
                                const totalLaborCost = quantityLaborCost + panelLaborCost;

                                return (
                                    <div key={item.id || i} className="rounded-md border border-orange-200 p-3 bg-orange-50/30">
                                        <div className="text-sm font-medium text-gray-800 mb-3">{item.description || item.name || 'פריט ריצוף'}</div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Regular Tiling */}
                                            {quantity > 0 && (
                                                <div className="rounded bg-white p-3 border border-blue-200">
                                                    <div className="font-semibold text-blue-700 mb-2 text-xs">ריצוף רגיל</div>
                                                    <div className="space-y-1 text-xs text-gray-700">
                                                        <div className="flex justify-between">
                                                            <span>שטח:</span>
                                                            <span className="font-semibold">{quantity.toFixed(1)} מ"ר</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>ימי עבודה:</span>
                                                            <span className="font-semibold">{quantityWorkDays.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>עלות עובדים:</span>
                                                            <span className="font-semibold text-blue-700">₪{formatPrice(quantityLaborCost)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Panel Work */}
                                            {panelQuantity > 0 && (
                                                <div className="rounded bg-white p-3 border border-indigo-200">
                                                    <div className="font-semibold text-indigo-700 mb-2 text-xs">עבודת פאנל</div>
                                                    <div className="space-y-1 text-xs text-gray-700">
                                                        <div className="flex justify-between">
                                                            <span>שטח פאנל:</span>
                                                            <span className="font-semibold">{panelQuantity.toFixed(1)} מ"ר</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>ימי עבודה:</span>
                                                            <span className="font-semibold">{panelWorkDays.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>עלות עובדים:</span>
                                                            <span className="font-semibold text-indigo-700">₪{formatPrice(panelLaborCost)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Total Summary */}
                                        <div className="mt-3 pt-3 border-t border-orange-200">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-semibold text-gray-700">סה"כ פריט:</span>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="bg-white border-orange-300 text-orange-700">
                                                        {totalArea.toFixed(1)} מ"ר
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-white border-orange-300 text-orange-700">
                                                        {totalWorkDays.toFixed(2)} ימים
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-white border-orange-300 text-orange-700 font-bold">
                                                        ₪{formatPrice(totalLaborCost)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
