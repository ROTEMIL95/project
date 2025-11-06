import { useState, useMemo } from 'react';

export const useProfitGuard = (minimumProfitPercent = 30) => {
  const [showProfitGuard, setShowProfitGuard] = useState(false);
  const [profitGuardData, setProfitGuardData] = useState(null);

  const checkProfitMargin = (totalRevenue, totalCost) => {
    if (!totalRevenue || !totalCost || totalCost <= 0) return null;
    
    const profit = totalRevenue - totalCost;
    const profitPercent = (profit / totalCost) * 100;
    
    if (profitPercent < minimumProfitPercent) {
      // חישוב המחיר המומלץ לרווח מינימלי
      const recommendedRevenue = totalCost * (1 + minimumProfitPercent / 100);
      
      return {
        currentProfitPercent: profitPercent,
        currentTotalPrice: totalRevenue,
        recommendedPrice: Math.ceil(recommendedRevenue), // עיגול למעלה לשקל הקרוב
        totalCost: totalCost,
        needsAdjustment: true
      };
    }
    
    return {
      currentProfitPercent: profitPercent,
      currentTotalPrice: totalRevenue,
      totalCost: totalCost,
      needsAdjustment: false
    };
  };

  const triggerProfitGuard = (totalRevenue, totalCost) => {
    const analysis = checkProfitMargin(totalRevenue, totalCost);
    
    if (analysis && analysis.needsAdjustment) {
      setProfitGuardData(analysis);
      setShowProfitGuard(true);
      return true; // מצביע שהמערכת הפעילה את ה-guard
    }
    
    return false; // הרווח תקין, אין צורך בהתערבות
  };

  const closeProfitGuard = () => {
    setShowProfitGuard(false);
    setProfitGuardData(null);
  };

  return {
    showProfitGuard,
    profitGuardData,
    triggerProfitGuard,
    closeProfitGuard,
    checkProfitMargin
  };
};