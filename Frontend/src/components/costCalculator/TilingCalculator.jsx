/**
 * פונקציה לחישוב עלויות ריצוף מדויקת על בסיס הפרמטרים ממחירון הקבלן
 */

/**
 * פונקציה מרכזית לחישוב מדדי ריצוף. זהו "מקור האמת" היחיד.
 * גם מחירון הקבלן וגם הצעת המחיר ישתמשו בפונקציה זו.
 */
export const calculateTilingMetrics = (tilingItem, area, projectComplexities = {}, complexityLevel = 0) => {
  if (!tilingItem || !area || area <= 0) return null;

  // חישוב חומרים
  const wastageMultiplier = 1 + (tilingItem.wastagePercent / 100 || 0);
  const totalMaterialsNeeded = area * wastageMultiplier;
  const totalMaterialCost = totalMaterialsNeeded * (tilingItem.materialCost || 0);

  // חישוב עבודה
  const laborCostMethod = tilingItem.laborCostMethod || 'perDay';
  let totalLaborCost = 0;
  let workDays = 0;

  if (laborCostMethod === 'perDay') {
    const dailyOutput = tilingItem.dailyOutput || 1;
    const dailyLaborCost = tilingItem.laborCost || 0; // Use tilingItem.laborCost for perDay
    workDays = Math.ceil(area / dailyOutput);
    totalLaborCost = workDays * dailyLaborCost;
  } else if (laborCostMethod === 'perSqM') {
    const laborCostPerSqM = tilingItem.laborCostPerSqM || 0;
    totalLaborCost = area * laborCostPerSqM;
    // Calculate workDays for perSqM method based on dailyOutput for informational purposes
    workDays = area / (tilingItem.dailyOutput || 1);
  }

  // חישוב עלויות נוספות (חומר לבן)
  const totalAdditionalCost = area * (tilingItem.additionalCost || 0);

  // עלות קבועה לפרויקט
  const fixedProjectCost = tilingItem.fixedProjectCost || 0;

  // סה"כ עלות לקבלן (ללא מורכבות, מורכבות משפיעה על מחיר ללקוח)
  const totalCost = totalMaterialCost + totalLaborCost + totalAdditionalCost + fixedProjectCost;

  // חישוב מחיר בסיסי ללקוח (לפני מורכבות)
  const desiredProfitPercent = tilingItem.desiredProfitPercent || 30;
  const baseCustomerPrice = Math.round(totalCost * (1 + desiredProfitPercent / 100));

  // חישוב תוספת מורכבות
  const complexityPercentage = Number(complexityLevel) || 0; // complexityLevel is 0-100
  // Complexity is calculated as a percentage of the labor cost, then added to the base customer price
  const complexityAddOnAmount = Math.round(totalLaborCost * (complexityPercentage / 100));

  // מחיר סופי ללקוח (כולל תוספת מורכבות)
  const finalCustomerPrice = baseCustomerPrice + complexityAddOnAmount;

  // חישוב רווח ואחוז רווח מעודכנים
  const finalProfit = finalCustomerPrice - totalCost;
  const finalProfitPercent = totalCost > 0 ? (finalProfit / totalCost) * 100 : 0;

  return {
    area,
    totalMaterialCost, // סה"כ עלות חומרים כולל בלאי לקבלן
    totalLaborCost, // סה"כ עלות עבודה לקבלן (לפני תוספת מורכבות במחיר ללקוח)
    totalAdditionalCost, // עלות חומרים נוספים לקבלן
    fixedProjectCost, // עלות קבועה לקבלן
    totalCost, // סה"כ עלות לקבלן (חומרים + עבודה + נוספים + קבועה)

    baseCustomerPrice, // מחיר בסיסי ללקוח לפני תוספת מורכבות
    complexityAddOnAmount, // סכום תוספת המורכבות למחיר הלקוח
    customerPrice: finalCustomerPrice, // סה"כ מחיר ללקוח (כולל מורכבות)

    profit: finalProfit, // רווח מהעסקה
    profitPercent: parseFloat(finalProfitPercent.toFixed(1)), // אחוז רווח מהעסקה

    workDays: Math.ceil(workDays), // ימי עבודה מעוגלים כלפי מעלה
    costPerSqM: area > 0 ? totalCost / area : 0, // עלות לקבלן למ"ר
    pricePerSqM: area > 0 ? finalCustomerPrice / area : 0, // מחיר ללקוח למ"ר
    complexityLevel: complexityPercentage // אחוז מורכבות שהופעל
  };
};

// פונקציה לפורמט מחירים
export const formatPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) return '0';
  return Math.round(price).toLocaleString('he-IL');
};