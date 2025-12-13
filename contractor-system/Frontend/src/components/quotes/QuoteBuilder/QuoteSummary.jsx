
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
        const endDate = timing.end_date || timing.endDate; // Support both snake_case and camelCase
        if (endDate) {
            const categoryEndDate = new Date(endDate);
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
            const startDate = timing.start_date || timing.startDate; // Support both snake_case and camelCase
            if (startDate) {
                const categoryStartDate = new Date(startDate);

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            <span className="text-xs sm:text-sm font-medium text-blue-700">סה״כ הכנסות צפויות</span>
                        </div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800">
                            {formatPrice(totalIncome)} ₪
                        </div>
                    </div>

                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                            <span className="text-xs sm:text-sm font-medium text-red-700">סה״כ הוצאות צפויות</span>
                        </div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-800">
                            {formatPrice(totalExpenses)} ₪
                        </div>
                    </div>

                    <div className={`${netFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border-2 rounded-lg p-3 sm:p-4 text-center`}>
                        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${netFlow >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                            <span className={`text-xs sm:text-sm font-medium ${netFlow >= 0 ? 'text-green-700' : 'text-orange-700'}`}>תזרים נטו</span>
                        </div>
                        <div className={`text-lg sm:text-xl md:text-2xl font-bold ${netFlow >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                            {formatPrice(netFlow)} ₪
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-64 sm:h-72 md:h-80">
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

    // ✅ FIX: Filter out summary items to prevent double counting
    const realItems = selectedItems.filter(item => item.source !== 'paint_plaster_category_summary');

    const subtotalItems = realItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const projectAdditionalCosts = (projectComplexities?.additionalCostDetails || []).reduce((sum, cost) => sum + (cost.cost || 0), 0);
    const finalSubtotal = subtotalItems + projectAdditionalCosts;

    const subtotalAfterIncrease = finalSubtotal + (finalSubtotal * priceIncrease) / 100;
    const discountAmount = (subtotalAfterIncrease * discount) / 100;
    const total = subtotalAfterIncrease - discountAmount;

    const totalItemsCost = realItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const totalContractorAdditionalCosts = (projectComplexities?.additionalCostDetails || []).reduce((sum, cost) => sum + (cost.contractorCost || cost.cost || 0), 0);
    const contractorComplexitySum = realItems.reduce((sum, it) => {
        return sum + (Number(it.complexityLaborAddedCost) || 0);
    }, 0);
    const totalContractorCost = totalItemsCost + totalContractorAdditionalCosts + contractorComplexitySum;

    const profit = total - totalContractorCost;
    const profitPercent = totalContractorCost > 0 ? (profit / totalContractorCost * 100) : (total > 0 ? 100 : 0);

    const totalWorkDays = realItems.reduce((sum, item) => {
        const workDuration = Number(item.workDuration) || 0;
        return sum + workDuration;
    }, 0);

    const complexityExtraHours = realItems.reduce((sum, it) => {
        return sum + (Number(it.complexityHoursAdded) || 0);
    }, 0);
    
    const workforceData = Object.entries(categoryTimings || {})
        .map(([categoryId, timings]) => {
            const startDate = timings?.start_date || timings?.startDate; // Support both formats
            const endDate = timings?.end_date || timings?.endDate; // Support both formats

            if (!timings || !startDate || !endDate) return null;
            const categoryItems = realItems.filter(item => item.categoryId === categoryId);
            if (categoryItems.length === 0) return null;

            const totalWorkDaysNeeded = categoryItems.reduce((sum, item) => {
                const workDuration = Number(item.workDuration) || 0;
                return sum + workDuration;
            }, 0);

            const availableWorkDays = calculateWorkingDays(startDate, endDate);
            const workersNeeded = availableWorkDays > 0 ? Math.ceil(totalWorkDaysNeeded / availableWorkDays) : 0;
            return workersNeeded;
        })
        .filter(Boolean);
    const totalWorkersNeeded = workforceData.reduce((sum, count) => sum + (Number(count) || 0), 0);

    const isLowProfit = profitPercent < 30;

    const allMaterialCosts = realItems.reduce((sum, item) => sum + (Number(item.materialCost) || 0), 0);
    const allLaborCosts = realItems.reduce((sum, item) => sum + (Number(item.laborCost) || 0), 0);

    const materialBreakdown = realItems.reduce((acc, item) => {
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

    const laborBreakdown = realItems.reduce((acc, item) => {
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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 sm:py-3 gap-2">
                            <Label htmlFor="priceIncrease" className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 sm:gap-2">
                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                העלאת מחיר (%)
                            </Label>
                            <div className="flex items-center gap-2 w-full sm:w-1/2">
                                <Input
                                    id="priceIncrease"
                                    type="number"
                                    value={priceIncrease}
                                    onChange={(e) => onUpdatePriceIncrease && onUpdatePriceIncrease(Number(e.target.value))}
                                    className="w-16 sm:w-20 text-center font-medium text-sm"
                                    placeholder="0"
                                />
                                <span className="text-xs sm:text-sm text-green-600 flex-1 text-right">
                                    (+{formatPrice((finalSubtotal * priceIncrease) / 100)} ₪)
                                </span>
                            </div>
                        </div>

                        {/* הנחה */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 sm:py-3 gap-2">
                            <Label htmlFor="discount" className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 sm:gap-2">
                                <Percent className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                הנחה (%)
                            </Label>
                            <div className="flex items-center gap-2 w-full sm:w-1/2">
                                <Input
                                    id="discount"
                                    type="number"
                                    value={discount}
                                    onChange={(e) => onUpdateDiscount(Number(e.target.value))}
                                    className="w-16 sm:w-20 text-center font-medium text-sm"
                                    placeholder="0"
                                />
                                <span className="text-xs sm:text-sm text-red-600 flex-1 text-right">(-{formatPrice(discountAmount)} ₪)</span>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="flex justify-between items-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm sm:text-base font-bold text-blue-800">סה"כ לתשלום</span>
                            <span className="text-lg sm:text-xl font-bold text-blue-700">{formatPrice(total)} ₪</span>
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

            {/* Big Numbers Footer */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center pt-4 sm:pt-6 border-t">
                <Card className="bg-red-50 border-red-200 shadow-sm">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-red-800">עלות כוללת לקבלן</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-700 tracking-tight">{formatPrice(totalContractorCost)} ₪</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200 shadow-sm">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-green-800">רווח צפוי (קבלן)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 tracking-tight">{formatPrice(profit)} ₪</p>
                        <p className="text-xs sm:text-sm font-semibold text-green-600 mt-1">({profitPercent.toFixed(1)}%)</p>
                    </CardContent>
                </Card>
                 <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-blue-800">מחיר סופי ללקוח</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700 tracking-tight">{formatPrice(total)} ₪</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
