
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Quote } from '@/lib/entities';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { addDays, addWeeks, format, startOfMonth, differenceInDays, isWithinInterval, startOfDay, eachDayOfInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";

// פונקציה לחישוב תאריך הוצאה לפי כללי תזמון
const calculateExpenseDate = (timingRule, categoryStartDate, categoryEndDate, baseDate = new Date()) => {
  if (!timingRule || !timingRule.type) {
    return categoryStartDate; // ברירת מחדל
  }

  const { type, dayOfMonth, offsetDays } = timingRule;

  switch (type) {
    case 'fixed_day_of_month': {
      // מחשב את התאריך הקרוב ביותר שיש בו את היום הנדרש
      const targetDay = Number(dayOfMonth) || 1;
      const startMonth = new Date(categoryStartDate);
      const startYear = startMonth.getFullYear();
      const startMonthNum = startMonth.getMonth();
      
      // נסה להניח את התשלום בחודש של תחילת העבודה
      let targetDate = new Date(startYear, startMonthNum, targetDay);
      
      // אם התאריך עבר, קח את החודש הבא
      if (targetDate < startMonth) {
        targetDate = new Date(startYear, startMonthNum + 1, targetDay);
      }
      
      return targetDate;
    }

    case 'category_start':
      return new Date(categoryStartDate);

    case 'category_end':
      return new Date(categoryEndDate);

    case 'offset_from_category_start': {
      const offset = Number(offsetDays) || 0;
      return addDays(new Date(categoryStartDate), offset);
    }

    case 'offset_from_category_end': {
      const offset = Number(offsetDays) || 0;
      return addDays(new Date(categoryEndDate), offset);
    }

    default:
      return categoryStartDate;
  }
};

export default function MonthlyCashFlowChart({ user }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netFlow: 0 });
  const [range, setRange] = useState("30");

  useEffect(() => {
    const calculateCashFlow = async () => {
      setLoading(true);
      try {
        if (!user || !user.email) {
          setChartData([]);
          setStats({ totalIncome: 0, totalExpenses: 0, netFlow: 0 });
          setLoading(false);
          return;
        }

        console.log("MonthlyCashFlowChart: Fetching quotes for user:", user.email, "status:", 'אושר');

        // Check if Quote.filter is available
        if (typeof Quote.filter !== 'function') {
          console.warn("MonthlyCashFlowChart: Quote.filter is not available yet. Backend not connected.");
          setChartData([]);
          setStats({ totalIncome: 0, totalExpenses: 0, netFlow: 0 });
          setLoading(false);
          return;
        }

        const approvedQuotes = await Quote.filter({ user_id: user.id, status: 'אושר' });
        console.log("MonthlyCashFlowChart: Fetched approved quotes:", approvedQuotes.length);
        
        const today = startOfDay(new Date());
        const rangeDays = parseInt(range, 10) || 30;
        const endDateRange = addDays(today, rangeDays - 1);
        
        const dailyDataMap = new Map();
        for (let i = 0; i < rangeDays; i++) {
          const date = addDays(today, i);
          const dateKey = format(date, 'yyyy-MM-dd');
          dailyDataMap.set(dateKey, {
            date: format(date, 'd/M'),
            fullDate: date,
            income: 0,
            expenses: 0,
            incomeItems: [],
            expenseItems: []
          });
        }

        let totalIncomeSum = 0;
        let totalExpensesSum = 0;

        const CATEGORY_LABELS = {
          cat_paint_plaster: 'צבע ושפכטל',
          cat_tiling: 'ריצוף וחיפוי',
          cat_demolition: 'הריסה ופינוי',
          cat_electricity: 'חשמל',
          cat_plumbing: 'אינסטלציה',
          cat_construction: 'בינוי (כללי)',
        };

        // טעינת הגדרות תזמון מהמשתמש לכל קטגוריה
        const paintExpenseTiming = user?.paintUserDefaults?.expenseTiming || {
          labor: { type: "category_start" },
          materials: { type: "category_start" }
        };

        const tilingExpenseTiming = user?.tilingUserDefaults?.expenseTiming || {
          labor: { type: "category_start" },
          materials: { type: "category_start" }
        };

        const demolitionExpenseTiming = user?.demolitionDefaults?.expenseTiming || {
          labor: { type: "category_end" }
        };

        const constructionExpenseTiming = user?.constructionDefaults?.expenseTiming || {
          labor: { type: "category_start" },
          materials: { type: "category_start" }
        };

        const plumbingExpenseTiming = user?.plumbingDefaults?.expenseTiming || {
          payment: { type: "category_start" }
        };

        const electricalExpenseTiming = user?.electricalDefaults?.expenseTiming || {
          payment: { type: "category_end" }
        };

        approvedQuotes.forEach(quote => {
          const {
            totalPrice = 0,
            finalAmount = 0,
            paymentTerms = [],
            categoryTimings = {},
            items = [],
            totalCost = 0
          } = quote;

          const total_price = finalAmount || totalPrice;
          const total_cost = totalCost;
          
          const projectPaymentTerms = (paymentTerms && paymentTerms.length > 0) ? paymentTerms : user.defaultPaymentTerms;

          // חישוב הכנסות (ללא שינוי)
          if (projectPaymentTerms && projectPaymentTerms.length > 0) {
            let latestCategoryEndDate = new Date(0);
            Object.values(categoryTimings).forEach(timing => {
              if (timing.endDate) {
                const catEndDate = new Date(timing.endDate);
                if (catEndDate > latestCategoryEndDate) latestCategoryEndDate = catEndDate;
              }
            });

            const approvalDate = new Date(quote.createdAt || today);
            const finalPaymentDate = latestCategoryEndDate > new Date(0) ? addWeeks(latestCategoryEndDate, 1) : addWeeks(approvalDate, 4);

            projectPaymentTerms.forEach((term, index) => {
              let paymentDate;
              const paymentAmount = (total_price * term.percentage) / 100;
              
              if (term.paymentDate) {
                paymentDate = new Date(term.paymentDate);
              } else {
                if (index === 0) {
                  paymentDate = approvalDate;
                } else if (index === projectPaymentTerms.length - 1) {
                  paymentDate = finalPaymentDate;
                } else {
                  const daysBetween = differenceInDays(finalPaymentDate, approvalDate);
                  const daysForThisPayment = (daysBetween * index) / (projectPaymentTerms.length - 1);
                  paymentDate = addDays(approvalDate, Math.round(daysForThisPayment));
                }
              }

              if (isWithinInterval(paymentDate, { start: today, end: endDateRange })) {
                const dateKey = format(paymentDate, 'yyyy-MM-dd');
                if (dailyDataMap.has(dateKey)) {
                  const current = dailyDataMap.get(dateKey);

                  const isFirst = index === 0;
                  const isLast = index === projectPaymentTerms.length - 1;
                  const phaseLabel = isFirst ? 'תחילת עבודה' : (isLast ? 'סיום פרויקט' : 'תשלום ביניים');
                  const label = (term.milestone && term.milestone.trim()) ? term.milestone : phaseLabel;

                  current.income += paymentAmount;
                  current.incomeItems.push({
                    quoteId: quote.id,
                    projectName: quote.projectName || 'פרויקט ללא שם',
                    clientName: quote.clientName || '',
                    amount: paymentAmount,
                    percentage: term.percentage ?? null,
                    label,
                    source: label
                  });
                  dailyDataMap.set(dateKey, current);
                  totalIncomeSum += paymentAmount;
                }
              }
            });
          }
          
          // חישוב הוצאות - עם תזמון דינמי עבור כל הקטגוריות
          let totalCategoryCostsSum = 0;
          let earliestStartDate = null;
          const categorySummaries = [];

          Object.entries(categoryTimings).forEach(([categoryId, timing]) => {
            if (timing.startDate && timing.endDate) {
              const startDate = new Date(timing.startDate);
              const endDate = new Date(timing.endDate);
              
              if (!earliestStartDate || startDate < earliestStartDate) {
                earliestStartDate = startDate;
              }

              const categoryItems = items.filter(item => item.categoryId === categoryId);
              
              // חישוב עלויות עבודה וחומרים בנפרד
              let categoryLaborCost = 0;
              let categoryMaterialCost = 0;
              
              categoryItems.forEach(item => {
                categoryLaborCost += (Number(item.laborCost) || 0);
                categoryMaterialCost += (Number(item.materialCost) || 0);
              });

              const categoryTotalCost = categoryLaborCost + categoryMaterialCost;

              const derivedCategoryName =
                CATEGORY_LABELS[categoryId] ||
                (categoryItems[0] && (categoryItems[0].categoryName || categoryItems[0].categoryId)) ||
                'קטגוריה';

              // בחירת הגדרות תזמון לפי קטגוריה
              let expenseTiming = null;
              let hasLaborTiming = false;
              let hasMaterialsTiming = false;
              let isSubcontractor = false;

              if (categoryId === 'cat_paint_plaster') {
                expenseTiming = paintExpenseTiming;
                hasLaborTiming = true;
                hasMaterialsTiming = true;
              } else if (categoryId === 'cat_tiling') {
                expenseTiming = tilingExpenseTiming;
                hasLaborTiming = true;
                hasMaterialsTiming = true;
              } else if (categoryId === 'cat_demolition') {
                expenseTiming = demolitionExpenseTiming;
                hasLaborTiming = true;
                hasMaterialsTiming = false; // אין חומרים בהריסה
              } else if (categoryId === 'cat_construction') {
                expenseTiming = constructionExpenseTiming;
                hasLaborTiming = true;
                hasMaterialsTiming = true;
              } else if (categoryId === 'cat_plumbing') {
                expenseTiming = plumbingExpenseTiming;
                isSubcontractor = true;
              } else if (categoryId === 'cat_electricity') {
                expenseTiming = electricalExpenseTiming;
                isSubcontractor = true;
              }

              // תזמון דינמי אם יש הגדרות
              if (expenseTiming && (hasLaborTiming || hasMaterialsTiming || isSubcontractor)) {
                if (isSubcontractor) {
                  // עבור קבלני משנה (חשמל ואינסטלציה) - תמיכה ב-3 אפשרויות!
                  const paymentType = expenseTiming.payment?.type || 'category_start'; // Default to category_start if not specified

                  if (paymentType === 'split_50_50') {
                    // חלוקה 50%-50%
                    const halfAmount = categoryTotalCost / 2;

                    // תשלום ראשון - תחילת עבודה
                    if (halfAmount > 0 && isWithinInterval(startDate, { start: today, end: endDateRange })) {
                      const dateKey = format(startDate, 'yyyy-MM-dd');
                      if (dailyDataMap.has(dateKey)) {
                        const current = dailyDataMap.get(dateKey);
                        current.expenses += halfAmount;
                        current.expenseItems.push({
                          quoteId: quote.id,
                          projectName: quote.projectName || 'פרויקט ללא שם',
                          clientName: quote.clientName || '',
                          categoryId,
                          categoryName: derivedCategoryName,
                          amount: halfAmount,
                          source: 'תשלום לקבלן משנה (50% - תחילה)'
                        });
                        dailyDataMap.set(dateKey, current);
                        totalExpensesSum += halfAmount;
                      }
                    }

                    // תשלום שני - סיום עבודה
                    if (halfAmount > 0 && isWithinInterval(endDate, { start: today, end: endDateRange })) {
                      const dateKey = format(endDate, 'yyyy-MM-dd');
                      if (dailyDataMap.has(dateKey)) {
                        const current = dailyDataMap.get(dateKey);
                        current.expenses += halfAmount;
                        current.expenseItems.push({
                          quoteId: quote.id,
                          projectName: quote.projectName || 'פרויקט ללא שם',
                          clientName: quote.clientName || '',
                          categoryId,
                          categoryName: derivedCategoryName,
                          amount: halfAmount,
                          source: 'תשלום לקבלן משנה (50% - סיום)'
                        });
                        dailyDataMap.set(dateKey, current);
                        totalExpensesSum += halfAmount;
                      }
                    }
                  } else {
                    // תשלום מלא (100%) - תחילה או סוף (category_start or category_end)
                    const singlePaymentDate = paymentType === 'category_start' ? startDate : endDate;

                    if (categoryTotalCost > 0 && isWithinInterval(singlePaymentDate, { start: today, end: endDateRange })) {
                      const dateKey = format(singlePaymentDate, 'yyyy-MM-dd');
                      if (dailyDataMap.has(dateKey)) {
                        const current = dailyDataMap.get(dateKey);
                        current.expenses += categoryTotalCost;
                        current.expenseItems.push({
                          quoteId: quote.id,
                          projectName: quote.projectName || 'פרויקט ללא שם',
                          clientName: quote.clientName || '',
                          categoryId,
                          categoryName: derivedCategoryName,
                          amount: categoryTotalCost,
                          source: 'תשלום לקבלן משנה'
                        });
                        dailyDataMap.set(dateKey, current);
                        totalExpensesSum += categoryTotalCost;
                      }
                    }
                  }
                } else {
                  // עבור קטגוריות עם עבודה + חומרים
                  // הוצאות עבודה
                  if (hasLaborTiming && categoryLaborCost > 0) {
                    const laborExpenseDate = calculateExpenseDate(
                      expenseTiming.labor,
                      startDate,
                      endDate,
                      today
                    );

                    if (isWithinInterval(laborExpenseDate, { start: today, end: endDateRange })) {
                      const dateKey = format(laborExpenseDate, 'yyyy-MM-dd');
                      if (dailyDataMap.has(dateKey)) {
                        const current = dailyDataMap.get(dateKey);
                        current.expenses += categoryLaborCost;
                        current.expenseItems.push({
                          quoteId: quote.id,
                          projectName: quote.projectName || 'פרויקט ללא שם',
                          clientName: quote.clientName || '',
                          categoryId,
                          categoryName: derivedCategoryName,
                          amount: categoryLaborCost,
                          source: 'עלויות עבודה'
                        });
                        dailyDataMap.set(dateKey, current);
                        totalExpensesSum += categoryLaborCost;
                      }
                    }
                  }

                  // הוצאות חומרים
                  if (hasMaterialsTiming && categoryMaterialCost > 0) {
                    const materialExpenseDate = calculateExpenseDate(
                      expenseTiming.materials,
                      startDate,
                      endDate,
                      today
                    );

                    if (isWithinInterval(materialExpenseDate, { start: today, end: endDateRange })) {
                      const dateKey = format(materialExpenseDate, 'yyyy-MM-dd');
                      if (dailyDataMap.has(dateKey)) {
                        const current = dailyDataMap.get(dateKey);
                        current.expenses += categoryMaterialCost;
                        current.expenseItems.push({
                          quoteId: quote.id,
                          projectName: quote.projectName || 'פרויקט ללא שם',
                          clientName: quote.clientName || '',
                          categoryId,
                          categoryName: derivedCategoryName,
                          amount: categoryMaterialCost,
                          source: 'עלויות חומרים'
                        });
                        dailyDataMap.set(dateKey, current);
                        totalExpensesSum += categoryMaterialCost;
                      }
                    }
                  }
                }

                totalCategoryCostsSum += categoryTotalCost;
              } else {
                // עבור קטגוריות ללא הגדרות תזמון - התנהגות רגילה (2 ימים לפני התחלה)
                const expenseDate = addDays(startDate, -2);

                categorySummaries.push({
                  categoryId,
                  categoryName: derivedCategoryName,
                  expenseDate,
                  totalCost: categoryTotalCost
                });

                if (categoryTotalCost > 0) {
                  totalCategoryCostsSum += categoryTotalCost;

                  if (isWithinInterval(expenseDate, { start: today, end: endDateRange })) {
                    const dateKey = format(expenseDate, 'yyyy-MM-dd');
                    if (dailyDataMap.has(dateKey)) {
                      const current = dailyDataMap.get(dateKey);
                      current.expenses += categoryTotalCost;
                      current.expenseItems.push({
                        quoteId: quote.id,
                        projectName: quote.projectName || 'פרויקט ללא שם',
                        clientName: quote.clientName || '',
                        categoryId,
                        categoryName: derivedCategoryName,
                        amount: categoryTotalCost,
                        source: 'עלויות קטגוריה'
                      });
                      dailyDataMap.set(dateKey, current);
                      totalExpensesSum += categoryTotalCost;
                    }
                  }
                }
              }
            }
          });

          // הוצאות נוספות (אם יש)
          const remainingCost = Math.max(0, (total_cost || 0) - totalCategoryCostsSum);
          if (remainingCost > 0 && categorySummaries.length > 0) {
            if (categorySummaries.length === 1) {
              const { categoryId, categoryName, expenseDate } = categorySummaries[0];
              if (isWithinInterval(expenseDate, { start: today, end: endDateRange })) {
                const dateKey = format(expenseDate, 'yyyy-MM-dd');
                if (dailyDataMap.has(dateKey)) {
                  const current = dailyDataMap.get(dateKey);
                  current.expenses += remainingCost;
                  current.expenseItems.push({
                    quoteId: quote.id,
                    projectName: quote.projectName || 'פרויקט ללא שם',
                    clientName: quote.clientName || '',
                    categoryId,
                    categoryName,
                    amount: remainingCost,
                    source: 'עלויות נוספות'
                  });
                  dailyDataMap.set(dateKey, current);
                  totalExpensesSum += remainingCost;
                }
              }
            } else {
              const sumOfCategoryItemsCost = categorySummaries.reduce((s, c) => s + (c.totalCost || 0), 0);
              let allocated = 0;

              if (sumOfCategoryItemsCost > 0) {
                categorySummaries.forEach((c, idx) => {
                  const portion = (idx === categorySummaries.length - 1)
                    ? (remainingCost - allocated)
                    : Math.round((remainingCost * (c.totalCost || 0)) / sumOfCategoryItemsCost);
                  allocated += portion;

                  if (portion > 0 && isWithinInterval(c.expenseDate, { start: today, end: endDateRange })) {
                    const dateKey = format(c.expenseDate, 'yyyy-MM-dd');
                    if (dailyDataMap.has(dateKey)) {
                      const current = dailyDataMap.get(dateKey);
                      current.expenses += portion;
                      current.expenseItems.push({
                        quoteId: quote.id,
                        projectName: quote.projectName || 'פרויקט ללא שם',
                        clientName: quote.clientName || '',
                        categoryId: c.categoryId,
                        categoryName: c.categoryName,
                        amount: portion,
                        source: 'עלויות נוספות (פרופורציונלי)'
                      });
                      dailyDataMap.set(dateKey, current);
                      totalExpensesSum += portion;
                    }
                  }
                });
              } else if (earliestStartDate) {
                const firstCat = categorySummaries.sort((a, b) => a.expenseDate.getTime() - b.expenseDate.getTime())[0];
                if (firstCat && isWithinInterval(firstCat.expenseDate, { start: today, end: endDateRange })) {
                  const dateKey = format(firstCat.expenseDate, 'yyyy-MM-dd');
                  if (dailyDataMap.has(dateKey)) {
                    const current = dailyDataMap.get(dateKey);
                    current.expenses += remainingCost;
                    current.expenseItems.push({
                      quoteId: quote.id,
                      projectName: quote.projectName || 'פרויקט ללא שם',
                      clientName: quote.clientName || '',
                      categoryId: firstCat.categoryId,
                      categoryName: firstCat.categoryName,
                      amount: remainingCost,
                      source: 'עלויות נוספות (עלות כוללת)'
                    });
                    dailyDataMap.set(dateKey, current);
                    totalExpensesSum += remainingCost;
                  }
                }
              }
            }
          }
        });
        
        setChartData(Array.from(dailyDataMap.values()));
        setStats({ totalIncome: totalIncomeSum, totalExpenses: totalExpensesSum, netFlow: totalIncomeSum - totalExpensesSum });
      } catch (error) {
        console.error("MonthlyCashFlowChart: Failed to calculate monthly cash flow:", error);
        // Don't show error, just show empty state
        setChartData([]);
        setStats({ totalIncome: 0, totalExpenses: 0, netFlow: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
        calculateCashFlow();
        const handleFocus = () => calculateCashFlow();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    } else {
        setLoading(false);
    }
  }, [user, range]);

  const formatCurrency = (value) => {
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return `${Math.round(value)}`;
  };
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (!(active && payload && payload.length)) return null;
    const day = payload[0].payload;

    const hasIncome =
      (day.incomeItems && day.incomeItems.length > 0) || (Number(day.income) > 0);
    const hasExpense =
      (day.expenseItems && day.expenseItems.length > 0) || (Number(day.expenses) > 0);

    if (!hasIncome && !hasExpense) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-[340px]">
        <p className="font-medium text-gray-800 mb-2">{`תאריך: ${label}`}</p>

        {hasIncome && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-emerald-700 mb-1">הכנסות</p>
            {day.incomeItems && day.incomeItems.length > 0 && (
              <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                {day.incomeItems.map((it, idx) => (
                  <div key={`inc-${idx}`} className="flex items-start justify-between gap-2">
                    <div className="text-xs text-gray-700 leading-4">
                      <div className="font-medium">{it.clientName || 'לקוח ללא שם'}</div>
                      <div className="text-[11px] text-gray-500">
                        {typeof it.percentage === 'number' ? `${it.percentage}%` : '—'} • {it.label || it.source || ''}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                      {Math.round(it.amount).toLocaleString()} ₪
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasExpense && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-rose-700 mb-1">הוצאות</p>
            {day.expenseItems && day.expenseItems.length > 0 && (
              <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                {day.expenseItems.map((it, idx) => (
                  <div key={`exp-${idx}`} className="flex items-start justify-between gap-2">
                    <div className="text-xs text-gray-700 leading-4">
                      <div className="font-medium">{it.projectName}</div>
                      <div className="text-[11px] text-gray-500">
                        {it.clientName}
                        {it.categoryName ? ` • ${it.categoryName}` : (it.source ? ` • ${it.source}` : '')}
                        {it.source && it.categoryName && ` • ${it.source}`}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-rose-600 whitespace-nowrap">
                      {Math.round(it.amount).toLocaleString()} ₪
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const statCards = [
    { title: "סה\"כ הכנסות צפויות", value: stats.totalIncome, icon: TrendingUp, color: "text-green-600", bgColor:"bg-green-50" },
    { title: "סה\"כ הוצאות צפויות", value: stats.totalExpenses, icon: TrendingDown, color: "text-red-600", bgColor:"bg-red-50" },
    { title: "תזרים נטו", value: stats.netFlow, icon: DollarSign, color: stats.netFlow >= 0 ? "text-blue-600" : "text-orange-600", bgColor: stats.netFlow >= 0 ? "bg-blue-50" : "bg-orange-50" },
  ];

  const rangeLabel = useMemo(() => {
    if (range === "7") return "7 ימים קדימה";
    if (range === "60") return "60 יום קדימה";
    return "30 יום קדימה";
  }, [range]);

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="p-6 h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-gray-600">מחשב תזרים מזומנים...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl text-gray-800">תזרים מזומנים - {rangeLabel}</CardTitle>
            <CardDescription className="text-gray-600">תחזית הכנסות והוצאות יומיות מהצעות מאושרות</CardDescription>
          </div>
          <div className="w-40">
            <Select value={range} onValueChange={(v) => setRange(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="טווח" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">שבוע (7 ימים)</SelectItem>
                <SelectItem value="30">30 יום</SelectItem>
                <SelectItem value="60">חודשיים (60 יום)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className={`${stat.bgColor} border-0 shadow-md`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {Math.round(stat.value).toLocaleString()} ₪
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} unit="₪" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="income" name="הכנסות" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="expenses" name="הוצאות" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
