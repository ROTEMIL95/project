
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Quote } from '@/lib/entities';
import { useUser } from '@/components/utils/UserContext';
import { Users, Calendar, Clock, AlertTriangle, Package, ShoppingCart, DollarSign, Lightbulb, Landmark } from 'lucide-react'; // Added Landmark
import { format, differenceInDays, addWeeks, addDays } from 'date-fns';
import { he } from 'date-fns/locale';

const CATEGORY_NAMES = {
  'cat_paint_plaster': 'צבע וטיח',
  'cat_tiling': 'ריצוף וחיפוי',
  'cat_demolition': 'הריסה ופינוי',
  'cat_electricity': 'חשמל',
  'cat_plumbing': 'אינסטלציה', 
  'cat_construction': 'בינוי כללי'
};

const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// פונקציה מעודכנת לחישוב עלויות וחומרים - עם פירוט נפרד
const calculateCategoryDetails = (categoryItems, userPriceList) => {
  let totalMaterialCost = 0;
  let totalLaborCost = 0;
  let totalFixedCosts = 0; // New accumulator for fixed costs
  const materialsMap = new Map();

  categoryItems.forEach(itemInQuote => {
    // אגרגציה של עלויות ישירות מפריט הצעת המחיר השמור
    totalMaterialCost += Number(itemInQuote.materialCost || 0);
    totalLaborCost += Number(itemInQuote.laborCost || 0); // Accumulate direct labor cost
    
    // חישוב נפרד של עלויות קבועות ותוספות מורכבות
    const itemFixedCosts = (Number(itemInQuote.fixedCostsTotal || 0)) + (Number(itemInQuote.complexityAddedCost || 0));
    totalFixedCosts += itemFixedCosts; // Accumulate fixed costs

    // יצירת רשימת קניות על בסיס פריט המאסטר
    const masterItem = userPriceList.find(p => p.id === itemInQuote.catalogItemId);

    if (masterItem) {
      const quantity = Number(itemInQuote.quantity || 0);
      const layers = Number(itemInQuote.layers || 1);

      // חישוב כמות לרשימת קניות
      const coveragePerUnit = Number(masterItem.coveragePerBucket || masterItem.coverage || 1);
      if (quantity > 0 && coveragePerUnit > 0) {
        const unitsNeeded = (quantity * layers) / coveragePerUnit;
        const materialName = masterItem.roomName || masterItem.tileName || masterItem.itemName || 'חומר לא מזוהה';
        const unitType = materialName.includes('צבע') || materialName.includes('טיח') || materialName.includes('שפכטל') ? 'דליים' : 'יחידות';

        // חישוב עלות משוערת לרשימת קניות
        const materialCostPerUnit = Number(masterItem.bucketPrice || masterItem.materialCost || 0);
        const costForList = unitsNeeded * materialCostPerUnit;

        if (materialsMap.has(materialName)) {
          const existing = materialsMap.get(materialName);
          existing.quantity += unitsNeeded;
          existing.cost += costForList;
        } else {
          materialsMap.set(materialName, {
            name: materialName,
            quantity: unitsNeeded,
            unitType: unitType,
            cost: costForList
          });
        }
      }
    } else {
      // console.warn('No master item found for quote item (could not generate detailed shopping list entry):', itemInQuote);
    }
  });

  const result = {
    totalMaterialCost: Math.round(totalMaterialCost),
    totalLaborCost: Math.round(totalLaborCost),
    totalFixedCosts: Math.round(totalFixedCosts), // Include fixed costs in the result
    materialsList: Array.from(materialsMap.values()).map(m => ({
        ...m,
        quantity: Math.ceil(m.quantity)
    }))
  };

  return result;
};

export default function UpcomingWorkforce() {
  const { user } = useUser();
  const [upcomingWork, setUpcomingWork] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingWork = async () => {
      try {
        if (user && user.email) {
          const { paintItems: userPaintItems = [], tilingItems: userTilingItems = [] } = user.user_metadata || {};
          
          const userPriceLists = {
            'cat_paint_plaster': userPaintItems,
            'cat_tiling': userTilingItems,
          };

          const approvedQuotes = await Quote.filter({ 
            user_id: user.id, 
            status: 'אושר' 
          });

          const upcomingCategories = [];
          const today = new Date();

          approvedQuotes.forEach(quote => {
            const { categoryTimings = {}, items = [], paymentTerms = [], total_price = 0, created_at, endDate: projectEndDate } = quote;

            // חישוב תאריך סיום העבודה האחרון בפרויקט
            let latestCategoryEndDate = new Date(0); // Initialize with a very old date
            Object.values(categoryTimings).forEach(timing => {
              if (timing.endDate) {
                const catEndDate = new Date(timing.endDate);
                if (!isNaN(catEndDate.getTime()) && catEndDate > latestCategoryEndDate) {
                    latestCategoryEndDate = catEndDate;
                }
              }
            });
            
            // אם אין תאריכי סיום לקטגוריות, נשתמש בתאריך סיום הפרויקט הכללי או בתאריך היצירה
            const fallbackEndDate = projectEndDate ? new Date(projectEndDate) : (created_at ? new Date(created_at) : today);
            if (latestCategoryEndDate.getTime() === new Date(0).getTime() || isNaN(latestCategoryEndDate.getTime())) { 
                latestCategoryEndDate = fallbackEndDate;
            }
            // If fallbackEndDate itself is invalid, use today.
            if (isNaN(latestCategoryEndDate.getTime())) {
                latestCategoryEndDate = today;
            }

            // חישוב תאריכים עבור תנאי התשלום - עם קדימות לתאריכים ידניים
            const approvalDate = new Date(created_at || today); // Use created_at if available, otherwise today
            const finalPaymentDate = addWeeks(latestCategoryEndDate, 1);

            const paymentTermsWithDates = (paymentTerms || []).map((term, index) => {
              let paymentDate;
              
              // **תיקון: בדיקה קודם כל אם יש תאריך ספציפי שהוזן ידנית**
              if (term.paymentDate) {
                // אם יש תאריך ספציפי שהקבלן הזין ידנית - השתמש בו
                paymentDate = new Date(term.paymentDate);
              } else {
                // אם אין תאריך ספציפי - חשב לפי הלוגיקה האוטומטית
                const validFinalPaymentDate = isNaN(finalPaymentDate.getTime()) ? today : finalPaymentDate;
                const validApprovalDate = isNaN(approvalDate.getTime()) ? today : approvalDate;

                if ((paymentTerms || []).length === 1) {
                  paymentDate = validApprovalDate;
                } else if (index === 0) {
                  paymentDate = validApprovalDate;
                } else if (index === (paymentTerms || []).length - 1) {
                  paymentDate = validFinalPaymentDate;
                } else {
                  const totalDaysBetween = differenceInDays(validFinalPaymentDate, validApprovalDate);
                  if (totalDaysBetween <= 0) {
                      paymentDate = validApprovalDate; 
                  } else {
                      const fraction = index / ((paymentTerms || []).length - 1);
                      const daysToAdd = Math.round(totalDaysBetween * fraction);
                      paymentDate = addDays(validApprovalDate, daysToAdd);
                  }
                }
              }

              return {
                ...term,
                paymentDate: format(paymentDate, 'dd/MM/yy')
              };
            });

            Object.entries(categoryTimings).forEach(([categoryId, timings]) => {
              if (timings.startDate) {
                const startDate = new Date(timings.startDate);
                const daysUntilStart = differenceInDays(startDate, today);

                if (daysUntilStart >= 0) {
                  const categoryItems = items.filter(item => item.categoryId === categoryId);
                  
                  const totalWorkDays = categoryItems.reduce((sum, item) => sum + (item.workDuration || 0), 0);
                  
                  const calculateWorkingDays = (start, end) => {
                    if (!start || !end) return 0;
                    const startD = new Date(start);
                    const endD = new Date(end);
                    let workingDays = 0;
                    for (let date = new Date(startD); date <= endD; date.setDate(date.getDate() + 1)) {
                      const dayOfWeek = date.getDay();
                      if (dayOfWeek >= 0 && dayOfWeek <= 4) workingDays++;
                    }
                    return workingDays;
                  };

                  const availableWorkDays = calculateWorkingDays(timings.startDate, timings.endDate);
                  
                  let averageWorkersPerDay = 0;
                  let recommendation1 = null;
                  let recommendation2 = null;

                  if (availableWorkDays > 0 && totalWorkDays > 0) {
                      averageWorkersPerDay = totalWorkDays / availableWorkDays;

                      // Recommendation 1: Round up and finish faster
                      const workersToFinishOnTime = Math.ceil(averageWorkersPerDay);
                      if (workersToFinishOnTime > 0) {
                          const actualDuration = totalWorkDays / workersToFinishOnTime;
                          recommendation1 = `אפשרות 1: העסק ${workersToFinishOnTime} פועלים וסיים את העבודה תוך ~${actualDuration.toFixed(1)} ימים.`;
                      }

                      // Recommendation 2: Baseline workers + final day burst
                      if (averageWorkersPerDay > 1 && availableWorkDays > 1) {
                          const baselineWorkers = Math.floor(averageWorkersPerDay);
                          const workDoneInBaseline = baselineWorkers * (availableWorkDays - 1);
                          const remainingWorkOnFinalDay = Math.ceil(totalWorkDays - workDoneInBaseline);
                          recommendation2 = `אפשרות 2: העסק ${baselineWorkers} פועלים ב-${availableWorkDays - 1} הימים הראשונים, ו-${remainingWorkOnFinalDay} פועלים ביום האחרון.`;
                      }
                  }

                  const relevantPriceList = userPriceLists[categoryId] || [];
                  const costDetails = calculateCategoryDetails(categoryItems, relevantPriceList);

                  upcomingCategories.push({
                    projectName: quote.projectName,
                    clientName: quote.clientName,
                    categoryId,
                    categoryName: CATEGORY_NAMES[categoryId] || 'קטגוריה',
                    startDate: timings.startDate,
                    endDate: timings.endDate,
                    daysUntilStart,
                    totalWorkDays,
                    workersNeeded: averageWorkersPerDay, // Storing the decimal value
                    recommendation1,
                    recommendation2,
                    costDetails,
                    paymentTerms: paymentTermsWithDates, // שימוש במערך המעודכן עם תאריכים
                    total_price: total_price || 0,
                    quoteId: quote.id
                  });
                }
              }
            });
          });

          upcomingCategories.sort((a, b) => a.daysUntilStart - b.daysUntilStart);
          setUpcomingWork(upcomingCategories);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming workforce data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingWork();
  }, [user]);

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingWork.length === 0) {
    return (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">תכנון כוח אדם ולוחות זמנים</h2>
          </div>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-gray-800">
                        פרויקטים עתידיים מאושרים
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 text-gray-500">
                         <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
                        <p className="font-semibold">לא נמצאו עבודות מתוכננות</p>
                        <p className="text-sm mt-1">
                            המערכת מציגה כאן את כל הפרויקטים המאושרים שתאריך ההתחלה שלהם הוא מהיום והלאה.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
  }

  const getUrgencyStyle = (days, categoryId) => {
    const categoryColors = {
      'cat_paint_plaster': 'border-l-blue-300 bg-blue-50/30',
      'cat_tiling': 'border-l-orange-300 bg-orange-50/30',
      'cat_demolition': 'border-l-red-300 bg-red-50/30',
      'cat_electricity': 'border-l-yellow-300 bg-yellow-50/30',
      'cat_plumbing': 'border-l-teal-300 bg-teal-50/30',
      'cat_construction': 'border-l-gray-400 bg-gray-50/30'
    };

    let urgencyBadge = '';
    if (days === 0) {
      urgencyBadge = 'bg-red-500 text-white shadow-sm';
    } else if (days <= 3) {
      urgencyBadge = 'bg-red-100 text-red-700 border border-red-200';
    } else if (days <= 7) {
      urgencyBadge = 'bg-orange-100 text-orange-700 border border-orange-200';
    } else {
      urgencyBadge = 'bg-green-100 text-green-700 border border-green-200';
    }

    return {
      cardClass: categoryColors[categoryId] || categoryColors['cat_construction'],
      badgeClass: urgencyBadge
    };
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg">
          <Users className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">תכנון כוח אדם ולוחות זמנים</h2>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">
            פרויקטים עתידיים מאושרים
          </CardTitle>
          <p className="text-gray-600 text-sm">
            הכן את הצוותים והחומרים לפרויקטים הקרובים
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {upcomingWork.map((work) => {
            const styles = getUrgencyStyle(work.daysUntilStart, work.categoryId);
            
            return (
              <div 
                key={`${work.quoteId}-${work.categoryId}`}
                className={`rounded-xl border-l-4 border border-gray-200/60 hover:shadow-md transition-all duration-300 ${styles.cardClass}`}
              >
                <div className="p-6">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-xl text-gray-800">{work.categoryName}</h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${styles.badgeClass}`}>
                        {work.daysUntilStart === 0 
                          ? 'היום' 
                          : work.daysUntilStart === 1 
                          ? 'מחר' 
                          : `בעוד ${work.daysUntilStart} ימים`
                        }
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-gray-600">{work.projectName}</div>
                      <div className="text-xs text-gray-500">לקוח: {work.clientName}</div>
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column: Workforce & Schedule */}
                    <div className="space-y-4">
                        <div className="bg-white/60 rounded-lg p-4 border">
                           <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                               <Calendar className="h-4 w-4 text-indigo-600" />
                               לוח זמנים וכוח אדם
                           </div>
                           <div className="space-y-2 text-sm">
                               <div className="flex justify-between">
                                 <span className="text-gray-600">תאריכים:</span>
                                 <span className="font-medium">{format(new Date(work.startDate), 'dd/MM')} - {format(new Date(work.endDate), 'dd/MM')}</span>
                               </div>
                               <div className="flex justify-between items-baseline">
                                 <span className="text-gray-600">ממוצע פועלים נדרש:</span>
                                 <span className="font-bold text-indigo-600 text-2xl">{work.workersNeeded.toFixed(1)}</span>
                               </div>
                               <div className="flex justify-between">
                                  <span className="text-gray-600">סה"כ ימי עבודה (פועל):</span>
                                  <span className="font-medium">{work.totalWorkDays.toFixed(1)}</span>
                               </div>
                           </div>
                        </div>

                        {(work.recommendation1 || work.recommendation2) && (
                            <div className="bg-white/60 rounded-lg p-4 border border-amber-200">
                                <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                   <Lightbulb className="h-4 w-4 text-amber-500" />
                                   המלצות לתכנון
                                </div>
                                <div className="space-y-2 text-xs text-gray-600">
                                    {work.recommendation1 && <p>• {work.recommendation1}</p>}
                                    {work.recommendation2 && <p>• {work.recommendation2}</p>}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Right Column: Costs & Materials */}
                    <div className="space-y-4">
                        <div className="bg-white/60 rounded-lg p-4 border">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                עלויות צפויות
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">חומרים:</span>
                                  <span className="font-bold text-blue-600">{formatPrice(work.costDetails.totalMaterialCost)} ₪</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">עבודה:</span>
                                  <span className="font-bold text-green-600">{formatPrice(work.costDetails.totalLaborCost)} ₪</span>
                                </div>
                                {work.costDetails.totalFixedCosts > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">עלויות קבועות:</span>
                                    <span className="font-bold text-orange-600">{formatPrice(work.costDetails.totalFixedCosts)} ₪</span>
                                  </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-white/60 rounded-lg p-4 border">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-cyan-600" />
                                תנאי תשלום
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {work.paymentTerms && work.paymentTerms.length > 0 ? (
                                    work.paymentTerms.map((term, termIndex) => (
                                        <div key={termIndex} className="flex justify-between items-center text-xs p-1 rounded hover:bg-gray-100">
                                            <span className="text-gray-600 truncate flex-1">{term.milestone} ({term.percentage}%)</span>
                                            <div className="flex items-center gap-3 text-right">
                                                <span className="font-bold text-gray-800 w-20 text-left">
                                                    {formatPrice((work.total_price * term.percentage) / 100)} ₪
                                                </span>
                                                <span className="font-mono text-gray-500 w-14 text-right">{term.paymentDate}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-500 text-center py-2">לא הוגדרו תנאי תשלום</p>
                                )}
                            </div>
                        </div>

                        {work.costDetails.materialsList && work.costDetails.materialsList.length > 0 && (
                          <div className="bg-white/60 rounded-lg p-4 border">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4 text-purple-600" />
                              רשימת קניות
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {work.costDetails.materialsList.map((material, materialIndex) => (
                                <div key={materialIndex} className="flex justify-between text-xs p-1 rounded hover:bg-gray-100">
                                  <span className="text-gray-600 truncate flex-1">{material.name}</span>
                                  <span className="font-medium text-gray-800 mr-2">{material.quantity} {material.unitType}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-6 p-4 bg-blue-50/50 rounded-lg border border-blue-200/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                זכור לתאם צוותים ולהזמין חומרים לפני תחילת העבודות. העלויות והכמויות מבוססות על הנתונים מהצעת המחיר.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
