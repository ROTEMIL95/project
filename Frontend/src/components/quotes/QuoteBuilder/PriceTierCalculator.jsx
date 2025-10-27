// פונקציה לחישוב מחיר לפי מדרגות
// תכנון מחדש עם לוגיקה נקייה ופשוטה

/**
 * מחשב מחיר לפי מדרגות מחיר
 * @param {Array} tiers - מערך של מדרגות מחיר, כל מדרגה מכילה minArea ו-price
 * @param {number} quantity - כמות בפועל
 * @returns {Object} - אובייקט המכיל את המדרגה שנבחרה והמחיר
 */
export const calculatePriceByTier = (tiers, quantity) => {
  // בדיקות תקינות
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    console.log('❌ אין מדרגות מחיר');
    return {
      price: null,
      tier: null,
      errorMessage: 'אין מדרגות מחיר זמינות'
    };
  }

  // המרה למבנה אחיד ונקי
  const cleanTiers = tiers.map(tier => ({
    minArea: Number(tier.minArea || tier.squareMeters || 0),
    price: Number(tier.price || 0),
    originalTier: tier
  }));

  // מיון לפי minArea בסדר עולה
  const sortedTiers = [...cleanTiers].sort((a, b) => a.minArea - b.minArea);

  console.log('מדרגות ממוינות:', 
    sortedTiers.map(t => `${t.minArea} מ"ר: ${t.price} ש"ח`).join(', '));
  console.log(`מחשב מחיר עבור: ${quantity} מ"ר`);
  
  // מדרגה ברירת מחדל - נשתמש במדרגה הראשונה אם לא נמצאה התאמה
  let selectedTier = sortedTiers[0];

  // לולאה פשוטה שעוברת על כל המדרגות
  for (let i = 0; i < sortedTiers.length; i++) {
    const currentTier = sortedTiers[i];
    const nextTier = (i < sortedTiers.length - 1) ? sortedTiers[i + 1] : null;
    
    // אם זו המדרגה האחרונה או שהכמות קטנה מהמינימום של המדרגה הבאה
    if (!nextTier || quantity < nextTier.minArea) {
      // אם הכמות גדולה או שווה למינימום של המדרגה הנוכחית
      if (quantity >= currentTier.minArea) {
        selectedTier = currentTier;
        console.log(`✅ נבחרה מדרגה: ${currentTier.minArea} מ"ר במחיר ${currentTier.price} ש"ח`);
        break;
      }
    }
  }

  return {
    price: selectedTier.price,
    tier: selectedTier.originalTier,
    minArea: selectedTier.minArea,
    errorMessage: null
  };
};

/**
 * חישוב מחיר לפריט בהצעת מחיר
 * פונקציה מאוחדת שמטפלת בכל סוגי החישוב - מדרגות מחיר, מורכבות, שכבות צבע, וכו'
 * 
 * @param {Object} options - הגדרות החישוב
 * @returns {Object} - אובייקט עם תוצאות החישוב
 */
export const calculateQuoteItemPrice = (options) => {
  const {
    catalogItem,          // פריט הקטלוג
    quantity,             // כמות בפועל
    complexityFactor = 1, // פקטור מורכבות (1 = רגיל, 1.1 = תוספת 10% וכו')
    paintLayers = null,   // הגדרות שכבות צבע (אופציונלי)
    wastagePercent = 0    // אחוז בלאי/פחת (0 = ללא פחת)
  } = options;

  // חישוב כמות כולל פחת
  const quantityWithWastage = quantity * (1 + wastagePercent / 100);
  
  console.log(`חישוב מחיר עבור: ${quantity} ${catalogItem.unit || 'יחידות'}, פקטור מורכבות: ${complexityFactor}`);
  
  // חישוב מחיר בסיסי
  let basePrice = catalogItem.customerPrice || 0;
  let selectedPriceTier = null;
  
  // אם יש מדרגות מחיר, חשב לפי מדרגה
  if (catalogItem.priceTiers && catalogItem.priceTiers.length > 0) {
    const result = calculatePriceByTier(catalogItem.priceTiers, quantity);
    
    if (result.errorMessage) {
      console.warn(result.errorMessage);
    } else {
      basePrice = result.price;
      selectedPriceTier = result.tier;
      console.log(`מחיר לפי מדרגה: ${basePrice} ש"ח (${result.minArea}+ מ"ר)`);
    }
  } else {
    console.log(`מחיר בסיסי: ${basePrice} ש"ח (אין מדרגות מחיר)`);
  }
  
  // אם יש הגדרות צבע, חשב את המחיר עם שכבות נוספות
  if (paintLayers && paintLayers.length > 1) {
    let totalPaintPrice = basePrice; // שכבה ראשונה תמיד 100%
    
    // הוספת מחיר עבור שכבות נוספות
    for (let i = 1; i < paintLayers.length; i++) {
      const percentForLayer = paintLayers[i].pricePercent || 50; // ברירת מחדל 50%
      totalPaintPrice += basePrice * (percentForLayer / 100);
    }
    
    basePrice = totalPaintPrice;
    console.log(`מחיר אחרי ${paintLayers.length} שכבות צבע: ${basePrice} ש"ח`);
  }
  
  // חישוב מחיר סופי כולל פקטור מורכבות
  const finalUnitPrice = Math.round(basePrice * complexityFactor);
  
  // חישוב סה"כ עם כמות (כולל פחת)
  const totalPrice = Math.round(finalUnitPrice * quantityWithWastage);
  
  // חישוב עלות
  const materialCostPerUnit = Number(catalogItem.materialCost) || 0;
  const materialCost = materialCostPerUnit * quantityWithWastage;
  
  const laborCostPerDay = Number(catalogItem.laborCost) || 500;
  const dailyOutput = Number(catalogItem.dailyOutput) || 10;
  
  // חישוב ימי עבודה
  const workDays = dailyOutput > 0 ? 
    Math.ceil((quantityWithWastage / dailyOutput) * complexityFactor) : 0;
  
  const laborCost = laborCostPerDay * workDays;
  const additionalCost = (Number(catalogItem.additionalCost) || 0) * quantityWithWastage;
  const totalCost = materialCost + laborCost + additionalCost;
  
  // חישוב רווח
  const profit = totalPrice - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  
  return {
    originalQuantity: quantity,
    finalQuantity: quantityWithWastage,
    basePrice,
    unitPrice: finalUnitPrice,
    totalPrice,
    materialCost,
    laborCost,
    additionalCost,
    totalCost,
    profit,
    profitPercent,
    workDays,
    selectedPriceTier
  };
};