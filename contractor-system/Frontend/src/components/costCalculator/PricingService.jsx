
/**
 * שירות חישוב מחירים משותף - משמש גם את מחירון הקבלן וגם את טופס הצעת מחיר
 */



/**
 * מזהה את מדרגת המחיר הנכונה עבור כמות ופריט קטלוג נתונים.
 * גרסה משופרת עם טיפול במדרגות ללא מחיר ותמיכה במספר שכבות ספציפי.
 * @param {object} item - אובייקט פריט הקטלוג (במקום itemId ו-catalogItems).
 * @param {number} quantity - הכמות לבדיקה.
 * @param {number} layers - מספר השכבות (ברירת מחדל: 1).
 * @returns {object|null} - אובייקט המכיל את המדרגה שנמצאה, טווח המחירים שלה, והמחיר הספציפי שנבחר.
 */
export function identifyPriceTier(item, quantity, layers = 1) {
  const numQty = Number(quantity);
  // שינוי: במקום itemId ו-catalogItems, הפונקציה מקבלת ישירות את אובייקט הפריט
  if (isNaN(numQty) || numQty <= 0 || !item) {
    return null;
  }

  if (!Array.isArray(item.priceTiers) || item.priceTiers.length === 0) {
    const price = Number(item.customerPrice || item.averageCustomerPrice || 0);
    return { tier: null, range: 'כללי', price: price };
  }

  // שלב 1: נרמול וסינון המדרגות
  const tiers = item.priceTiers
    .map(t => ({
      max: Number(t.maxArea || t.squareMeters || t.quantity || t.max || 0),
      price: Number(t.price || t.pricePerUnit || t.unitPrice || 0),
      pricesByLayer: t.pricesByLayer || {},
      originalTier: t // Store the original tier object for later use
    }))
    .filter(t => !isNaN(t.max) && t.max > 0)
    .sort((a, b) => a.max - b.max);

  if (tiers.length === 0) {
    const price = Number(item.customerPrice || item.averageCustomerPrice || 0);
    return { tier: null, range: 'כללי', price: price };
  }

  // שלב 2: מציאת המדרגה המתאימה
  let matchedTier = null;
  let range = 'כללי';
  let min = 0;

  for (const tier of tiers) {
    if (numQty > min && numQty <= tier.max) {
      matchedTier = tier;
      range = `${Math.round(min + 1)} - ${tier.max}`;
      break;
    }
    min = tier.max;
  }

  if (!matchedTier && numQty > min) {
    matchedTier = tiers[tiers.length - 1];
    range = `${min}+`;
  }

  if (!matchedTier) {
    matchedTier = tiers[0];
    range = `1 - ${matchedTier.max}`;
  }

  // שלב 3: קביעת המחיר עם טיפול במחירים חסרים ובמספר שכבות ספציפי
  let price = matchedTier.price;

  // אם יש מחירים לפי שכבות, נשתמש במחיר הספציפי לפי מספר השכבות
  if (matchedTier.pricesByLayer && typeof matchedTier.pricesByLayer === 'object') {
    const layerKey = String(layers);
    const layerPrice = Number(matchedTier.pricesByLayer[layerKey] || 0);

    if (layerPrice > 0) {
      price = layerPrice;
    }
  }

  // אם המחיר עדיין אפס או שלא נמצא, נחפש במדרגות קודמות
  if (price <= 0) {
    const matchedIndex = tiers.findIndex(t => t.max === matchedTier.max);
    for (let i = matchedIndex - 1; i >= 0; i--) {
      // בודק קודם במחירים לפי שכבות
      if (tiers[i].pricesByLayer && typeof tiers[i].pricesByLayer === 'object') {
        const layerKey = String(layers);
        const layerPrice = Number(tiers[i].pricesByLayer[layerKey] || 0);
        if (layerPrice > 0) {
          price = layerPrice;
          break;
        }
      }
      // אם לא מוצא, בודק במחיר הכללי של המדרגה
      if (tiers[i].price > 0) {
        price = tiers[i].price;
        break;
      }
    }
  }

  // אם עדיין אין מחיר, שימוש במחיר הבסיס של הפריט
  if (price <= 0) {
    price = Number(item.customerPrice || item.averageCustomerPrice || 0);
  }

  return { tier: matchedTier.originalTier, range, price };
}

/**
 * מחשב את כל המדדים עבור פריט וכמות ספציפיים.
 * @param {Object} item - פריט מהקטלוג (אובייקט הפריט הספציפי).
 * @param {number} quantity - הכמות.
 * @param {Array} allItems - כל הפריטים בקטלוג (לא בשימוש ביישום הנוכחי).
 * @param {Object} options - אובייקט אופציות נוספות.
 * @returns {Object|null} מדדים מחושבים.
*/
export const calculateItemMetricsForQuantity = (item, quantity, allItems = [], options = {}) => {
    if (!item || !quantity || quantity <= 0) {
        return null;
    }

    // Extract options with defaults
    const layers = options.layers || 1;
    const applyFixedCost = options.applyFixedCost !== false;
    const complexity = options.complexity || { percent: 0, description: '' };

    // ===========================================
    // 1. CALCULATE ALL CONTRACTOR-SIDE COSTS FIRST
    // ===========================================

    // Material cost calculation
    const bucketPrice = parseFloat(item.bucketPrice) || 0;
    const baseCoverage = parseFloat(item.coverage) || 1;
    let totalBucketsNeeded = 0;
    for (let layerNum = 0; layerNum < layers; layerNum++) {
        let layerCoverage = baseCoverage;
        if (item.layerSettings && Array.isArray(item.layerSettings)) {
            const layerSetting = item.layerSettings[layerNum];
            if (layerSetting && layerSetting.coverage !== undefined) {
                // FIX: Use absolute values instead of percentage-based
                layerCoverage = Number(layerSetting.coverage) > 0 ? Number(layerSetting.coverage) : baseCoverage;
            }
        }
        totalBucketsNeeded += quantity / layerCoverage;
    }
    const bucketsNeeded = Math.ceil(totalBucketsNeeded);
    const materialCostTotal = bucketsNeeded * bucketPrice;

    // Labor cost calculation
    const workerDailyCost = parseFloat(item.workerDailyCost) || 0;
    const baseDailyOutput = parseFloat(item.dailyOutput) || 1;
    let totalRawWorkDays = 0;
    for (let i = 0; i < layers; i++) {
        let layerOutput = baseDailyOutput;
        if (item.layerSettings && Array.isArray(item.layerSettings)) {
            const layerSetting = item.layerSettings[i];
            if (layerSetting && (layerSetting.dailyOutput !== undefined || layerSetting.discountPercent !== undefined)) {
                // FIX: Use absolute values instead of percentage-based
                layerOutput = Number(layerSetting.dailyOutput || layerSetting.discountPercent) > 0
                    ? Number(layerSetting.dailyOutput || layerSetting.discountPercent)
                    : baseDailyOutput;
            }
        }
        totalRawWorkDays += quantity / layerOutput;
    }
    const workDays = Math.ceil(totalRawWorkDays);
    const laborCostTotal = workDays * workerDailyCost;

    // Fixed costs
    const equipmentCostTotal = applyFixedCost ? (parseFloat(item.equipmentCost) || 0) : 0;
    const fixedProjectCost = applyFixedCost ? (parseFloat(item.fixedProjectCost) || 0) : 0;

    // Additional costs (per meter)
    const preparationCostTotal = (parseFloat(item.preparationCostPerMeter) || 0) * quantity;
    const cleaningCostTotal = (parseFloat(item.cleaningCostPerMeter) || 0) * quantity;
    const additionalCostTotal = preparationCostTotal + cleaningCostTotal;

    // Total contractor cost
    const totalContractorCost = materialCostTotal + laborCostTotal + equipmentCostTotal + fixedProjectCost + additionalCostTotal;

    // ====================================================
    // 2. DETERMINE CUSTOMER PRICE (New Logic vs. Tiers)
    // ====================================================
    
    let totalCustomerPrice;
    let unitPriceCustomer = 0;
    let pricingMethod = 'tiers'; // Default to tiers
    const totalSquareMetersForPainting = quantity * layers;

    if (item.desiredProfitPercent && Number(item.desiredProfitPercent) > 0) {
        // --- Use new Profit Percentage method ---
        pricingMethod = 'profit_percent';
        const profit = totalContractorCost * (Number(item.desiredProfitPercent) / 100);
        totalCustomerPrice = totalContractorCost + profit;

        if (totalSquareMetersForPainting > 0) {
            unitPriceCustomer = totalCustomerPrice / totalSquareMetersForPainting;
        } else {
            // If quantity is 0, unit price is not applicable.
            unitPriceCustomer = 0;
        }

    } else {
        // --- Fallback to existing Tier-based method ---
        let selectedTier = null;
        if (item.priceTiers && Array.isArray(item.priceTiers) && item.priceTiers.length > 0) {
            const sortedTiers = [...item.priceTiers].sort((a, b) => (a.squareMeters || 0) - (b.squareMeters || 0));
            selectedTier = sortedTiers.find(tier => quantity <= (tier.squareMeters || 0));
            if (!selectedTier && sortedTiers.length > 0) {
                selectedTier = sortedTiers[sortedTiers.length - 1]; // If quantity is greater than all maxes, use the largest tier
            }
        }

        if (selectedTier) {
            if (selectedTier.pricesByLayer && selectedTier.pricesByLayer[String(layers)]) {
                unitPriceCustomer = parseFloat(selectedTier.pricesByLayer[String(layers)]) || 0;
            } else if (selectedTier.pricesByLayer && selectedTier.pricesByLayer['1']) {
                unitPriceCustomer = parseFloat(selectedTier.pricesByLayer['1']) || 0;
            }
            totalCustomerPrice = unitPriceCustomer * totalSquareMetersForPainting;
        } else {
            // If no tiers and no profit %, we can't determine customer price from standard methods.
            // Fallback to customerPrice from item if available, otherwise 0.
            totalCustomerPrice = parseFloat(item.customerPrice || item.averageCustomerPrice || 0) * totalSquareMetersForPainting;
            if (totalSquareMetersForPainting > 0) {
                unitPriceCustomer = parseFloat(item.customerPrice || item.averageCustomerPrice || 0);
            }
        }
    }

    // Safety net: ensure totalCustomerPrice is not less than totalContractorCost to prevent negative profit display due to misconfigured tiers.
    // This check is not needed for profit_percent method as it's designed to always have a profit.
    if (totalCustomerPrice < totalContractorCost) {
      totalCustomerPrice = totalContractorCost;
    }


    // ====================================================
    // 3. CALCULATE FINAL METRICS
    // ====================================================
    
    const totalProfit = totalCustomerPrice - totalContractorCost;
    const profitPercent = totalContractorCost > 0 ? (totalProfit / totalContractorCost * 100) : (totalCustomerPrice > 0 ? Infinity : 0);

    const result = {
        unitPriceCustomer: parseFloat(unitPriceCustomer.toFixed(2)),
        totalCustomerPrice: parseFloat(totalCustomerPrice.toFixed(2)),
        materialCostTotal: parseFloat(materialCostTotal.toFixed(2)),
        laborCostTotal: parseFloat(laborCostTotal.toFixed(2)),
        equipmentCostTotal: parseFloat(equipmentCostTotal.toFixed(2)),
        fixedProjectCost: parseFloat(fixedProjectCost.toFixed(2)),
        additionalCostTotal: parseFloat(additionalCostTotal.toFixed(2)),
        totalContractorCost: parseFloat(totalContractorCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        profitPercent: parseFloat(profitPercent.toFixed(2)),
        workDays: workDays,
        bucketsNeeded: Math.ceil(totalBucketsNeeded),
        rawWorkDays: totalRawWorkDays,
        unitPriceLabor: quantity > 0 ? parseFloat((laborCostTotal / quantity).toFixed(2)) : 0,
        pricingMethod: pricingMethod, // Return which method was used
    };

    return result;
};

const getDefaultMetrics = () => ({
    validArea: 0,
    workDays: 0,
    billableWorkDays: 0,
    tilesAreaWithWastage: 0,
    totalMaterialsCost: 0,
    totalLaborCost: 0,
    totalCost: 0,
    customerPrice: 0,
    profit: 0,
    profitPercentage: 0,
    costPerMeter: 0,
    pricePerMeter: 0,
});

export const calculateTilingMetrics = (tilingItem, area, projectComplexities = {}) => {
    try {
        const validArea = Math.max(0, Number(area) || 0);
        
        if (validArea <= 0) {
            return getDefaultMetrics();
        }

        const dailyOutput = Number(tilingItem.dailyOutput) || 0;
        if (dailyOutput <= 0) {
            return getDefaultMetrics();
        }

        // FIX: Use laborCostPerDay instead of workerDailyCost
        const dailyLaborCost = Number(tilingItem.laborCostPerDay) || Number(tilingItem.workerDailyCost) || 0;
        
        const workDays = validArea / dailyOutput;
        const billableWorkDays = Math.max(1, Math.ceil(workDays));
        
        const wastagePercent = Number(tilingItem.wastagePercent) || 0;
        const wastageFactor = 1 + (wastagePercent / 100);
        
        const tileCostPerMeter = Number(tilingItem.materialCost) || 0;
        const additionalCostPerMeter = Number(tilingItem.additionalCost) || 0;
        
        const tilesAreaWithWastage = tileCostPerMeter > 0 ? validArea * wastageFactor : validArea;
        const totalMaterialsCost = Math.round((tileCostPerMeter * tilesAreaWithWastage) + (additionalCostPerMeter * validArea));
        const totalLaborCost = Math.round(billableWorkDays * dailyLaborCost);
        
        const totalCost = totalMaterialsCost + totalLaborCost;

        const desiredProfitPercent = Number(tilingItem.desiredProfitPercent) || 30;
        const profit = totalCost * (desiredProfitPercent / 100);
        const customerPrice = Math.round(totalCost + profit);

        return {
            validArea,
            workDays,
            billableWorkDays,
            tilesAreaWithWastage,
            totalMaterialsCost,
            totalLaborCost,
            totalCost,
            customerPrice,
            profit,
            profitPercentage: totalCost > 0 ? ((profit / totalCost) * 100) : 0,
            costPerMeter: validArea > 0 ? (totalCost / validArea) : 0,
            pricePerMeter: validArea > 0 ? (customerPrice / validArea) : 0,
        };
    } catch (error) {
        console.error("Error in calculateTilingMetrics:", error);
        return getDefaultMetrics();
    }
};

/**
 * מחשב את עלויות הקבלן עבור פריט צבע, בהתבסס על הנתונים הפיזיים מהמחירון.
 */
export function calculatePaintContractorCosts(paintItem, quantity, selectedLayers = 1) {
  if (!paintItem || quantity <= 0) {
    return {
      materialCost: 0, laborCost: 0, workDays: 0, totalCost: 0, totalCostPerUnit: 0,
      requirements: { totalBucketsFinal: 0, totalWorkDaysFinal: 0 }
    };
  }

  const costPerBucket = Number(paintItem.materialCost || 0);
  const coveragePerBucket = Number(paintItem.coverage || paintItem.coveragePerBucket || 20);
  const dailyOutput = Number(paintItem.dailyOutput || paintItem.hespekYomi || 50);
  const laborCostPerDay = Number(paintItem.workerDailyCost || paintItem.laborCost || 500);

  const totalPaintedArea = quantity * selectedLayers;
  const totalBucketsNeeded = coveragePerBucket > 0 ? totalPaintedArea / coveragePerBucket : 0;
  const totalMaterialCost = totalBucketsNeeded * costPerBucket;
  const totalWorkDaysNeeded = dailyOutput > 0 ? totalPaintedArea / dailyOutput : 0;
  const totalLaborCost = totalWorkDaysNeeded * laborCostPerDay;
  const totalCost = totalMaterialCost + totalLaborCost;
  const totalCostPerUnit = quantity > 0 ? totalCost / quantity : 0;

  return {
    materialCost: totalMaterialCost,
    laborCost: totalLaborCost,
    workDays: totalWorkDaysNeeded,
    totalCost,
    totalCostPerUnit,
    requirements: {
      totalBucketsFinal: totalBucketsNeeded.toFixed(1),
      totalWorkDaysFinal: totalWorkDaysNeeded.toFixed(1),
    }
  };
}

export const calculateExactPaintMetrics = (item, squareMeters, layersToApply, roundUpBuckets = true, roundUpWorkDays = false) => {
    if (!item || squareMeters <= 0 || layersToApply <= 0) {
        return {
            totalCost: 0,
            costPerMeter: 0,
            totalMaterialCost: 0,
            totalLaborCost: 0,
            totalWorkDays: 0,
            totalBucketsNeeded: 0,
            finalBuckets: 0,
            finalWorkDays: 0, // Added to default return
        };
    }

    const bucketPrice = Number(item.bucketPrice) || Number(item.materialCost) || 0;
    const baseCoverage = Number(item.coverage) || 0;
    const workerDailyCost = Number(item.workerDailyCost) || Number(item.laborCost) || 0;
    const baseDailyOutput = Number(item.dailyOutput) || 0;
    const equipmentCostPerMeter = Number(item.equipmentCost || item.additionalCost || 0);
    const cleaningCostPerMeter = Number(item.cleaningCostPerMeter) || 0;
    const preparationCostPerMeter = Number(item.preparationCostPerMeter) || 0;
    const difficultyMultiplier = item.selectedDifficulty?.multiplier || 1;

    let totalBucketsNeeded = 0;
    let totalWorkDays = 0;

    // --- START OF FIX: Detailed calculation per layer ---
    const hasDetailedSettings = item.layerSettings && item.layerSettings.length > 0;

    if (hasDetailedSettings) {
        for (let i = 0; i < layersToApply; i++) {
            // Fallback for cases where layersToApply is greater than available settings
            const layerSetting = item.layerSettings[i] || item.layerSettings[item.layerSettings.length - 1];
            if (!layerSetting) continue;

            // FIX: חישוב עצמאי - כל שכבה משתמשת בערך המוחלט שלה
            // זה מבטיח שסדר השכבות לא משפיע על התוצאה
            // אם אין ערך מוגדר, משתמשים בבסיס
            const currentLayerCoverage = Number(layerSetting.coverage) > 0
                ? Number(layerSetting.coverage)
                : baseCoverage;

            const currentLayerDailyOutput = Number(layerSetting.dailyOutput || layerSetting.discountPercent) > 0
                ? Number(layerSetting.dailyOutput || layerSetting.discountPercent)
                : baseDailyOutput;

            if (currentLayerCoverage > 0) {
                totalBucketsNeeded += squareMeters / currentLayerCoverage;
            }
            if (currentLayerDailyOutput > 0) {
                totalWorkDays += squareMeters / currentLayerDailyOutput;
            }
        }
    } else {
        // Fallback to old, simple logic if detailed settings are missing
        if (baseCoverage > 0) {
            totalBucketsNeeded = (squareMeters / baseCoverage) * layersToApply;
        }
        if (baseDailyOutput > 0) {
            totalWorkDays = (squareMeters / baseDailyOutput) * layersToApply;
        }
    }
    // --- END OF FIX ---

    const finalBuckets = roundUpBuckets ? Math.ceil(totalBucketsNeeded) : totalBucketsNeeded;
    const totalMaterialCost = finalBuckets * bucketPrice;

    // --- START OF FIX: Add rounding for work days ---
    const finalWorkDays = roundUpWorkDays ? Math.ceil(totalWorkDays) : totalWorkDays;
    const totalLaborCost = finalWorkDays * workerDailyCost;
    // --- END OF FIX ---

    const totalOtherCosts = (equipmentCostPerMeter + cleaningCostPerMeter + preparationCostPerMeter) * squareMeters;
    
    const totalCost = (totalMaterialCost + totalLaborCost + totalOtherCosts) * difficultyMultiplier;
    
    const costPerMeter = squareMeters > 0 ? totalCost / squareMeters : 0;
    
    return {
        totalCost: Math.round(totalCost),
        costPerMeter: Number(costPerMeter.toFixed(2)),
        totalMaterialCost: Math.round(totalMaterialCost),
        totalLaborCost: Math.round(totalLaborCost),
        totalWorkDays: Number(totalWorkDays.toFixed(1)), // Keep the exact for display
        finalWorkDays: Number(finalWorkDays.toFixed(1)), // The value used in calculation
        totalBucketsNeeded: Number(totalBucketsNeeded.toFixed(2)),
        finalBuckets: finalBuckets,
    };
};

export const calculatePaintMetrics = (item, squareMeters, layersToApply, desiredProfitPercent, roundUpBuckets = true, roundUpWorkDays = false) => {
  // This function might need to be updated to use calculateExactPaintMetrics in the future
  // to leverage the new, precise layer calculation logic.
  // For now, retaining its original implementation as per instructions.
  if (!item || squareMeters <= 0 || layersToApply <= 0) {
    return {
      totalCost: 0,
      costPerMeter: 0,
      totalMaterialCost: 0,
      totalLaborCost: 0,
      totalWorkDays: 0,
      totalBucketsNeeded: 0,
      finalBuckets: 0,
      totalProfit: 0,
      profitPercentage: 0,
      finalWorkDays: 0, // Added to default return
      sellingPrice: 0,
      sellingPricePerMeter: 0,
    };
  }

  const costMetrics = calculateExactPaintMetrics(item, squareMeters, layersToApply, roundUpBuckets, roundUpWorkDays);
  const { totalCost, costPerMeter } = costMetrics;

  const profit = totalCost * ((Number(desiredProfitPercent) || 0) / 100);
  const sellingPrice = totalCost + profit;
  const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    totalCost: Math.round(totalCost),
    costPerMeter: Number(costPerMeter.toFixed(2)),
    totalMaterialCost: Math.round(costMetrics.totalMaterialCost),
    totalLaborCost: Math.round(costMetrics.totalLaborCost),
    totalWorkDays: Number(costMetrics.totalWorkDays.toFixed(1)),
    totalBucketsNeeded: Number(costMetrics.totalBucketsNeeded.toFixed(2)),
    finalBuckets: costMetrics.finalBuckets,
    totalProfit: Math.round(profit),
    profitPercentage: Number(profitPercentage.toFixed(2)),
    sellingPrice: Math.round(sellingPrice),
    sellingPricePerMeter: Number((sellingPrice / squareMeters).toFixed(2)),
    finalWorkDays: Number(costMetrics.finalWorkDays.toFixed(1)), // Added to final return
  };
};

/**
 * חישוב עלויות פאנל בהתבסס על פריט ריצוף נבחר
 * @param {Object} tilingItem - פריט הריצוף שנבחר (מכיל הגדרות פאנל)
 * @param {number} panelLinearMeters - כמות הפאנל במטר רץ
 * @param {Object} userDefaults - ברירות מחדל של המשתמש (אם אין בפריט)
 * @returns {Object} אובייקט עם כל נתוני העלויות והרווח של הפאנל
 */
export const calculatePanelCosts = (tilingItem, panelLinearMeters, userDefaults = {}) => {
  try {
    const panelQuantity = parseFloat(panelLinearMeters) || 0;
    
    if (!tilingItem || panelQuantity <= 0) {
      return {
        totalMaterialCost: 0,
        totalLaborCost: 0,
        totalCost: 0,
        profit: 0,
        sellingPrice: 0,
        workDays: 0,
        materialCostPerLinearMeter: 0,
        laborCostPerLinearMeter: 0,
        costPerLinearMeter: 0,
        sellingPricePerLinearMeter: 0
      };
    }

    // Get panel settings (item-specific or fallback to user defaults)
    const panelLaborWorkCapacity = Number(tilingItem.panelLaborWorkCapacity) || Number(userDefaults.panelLaborWorkCapacity) || 50;
    const panelUtilizationPercent = Number(tilingItem.panelUtilizationPercent) !== undefined ? Number(tilingItem.panelUtilizationPercent) : (Number(userDefaults.panelUtilizationPercent) || 30);
    
    // Material cost calculation for panel - CORRECTED to match user's understanding
    const tileMaterialCostPerSqM = Number(tilingItem.materialCost) || 0;
    
    // Direct percentage conversion: if 50%, then 1 SQM at 60 ILS becomes 30 ILS per linear meter
    const panelMaterialCostPerLinearMeter = tileMaterialCostPerSqM * (panelUtilizationPercent / 100);
    
    const totalMaterialCost = panelMaterialCostPerLinearMeter * panelQuantity;

    // Labor cost calculation for panel
    const workDays = panelQuantity / panelLaborWorkCapacity;
    const dailyLaborCost = Number(tilingItem.laborCostPerDay) || Number(userDefaults.laborCostPerDay) || 0;
    const totalLaborCost = workDays * dailyLaborCost;

    // Total cost and pricing
    const totalCost = totalMaterialCost + totalLaborCost;
    const desiredProfitPercent = Number(tilingItem.desiredProfitPercent) || Number(userDefaults.desiredProfitPercent) || 0;
    const profit = totalCost * (desiredProfitPercent / 100);
    const sellingPrice = totalCost + profit;

    // Per linear meter calculations
    const materialCostPerLinearMeter = panelQuantity > 0 ? totalMaterialCost / panelQuantity : 0;
    const laborCostPerLinearMeter = panelQuantity > 0 ? totalLaborCost / panelQuantity : 0;
    const costPerLinearMeter = panelQuantity > 0 ? totalCost / panelQuantity : 0;
    const sellingPricePerLinearMeter = panelQuantity > 0 ? sellingPrice / panelQuantity : 0;

    return {
      totalMaterialCost: Math.round(totalMaterialCost),
      totalLaborCost: Math.round(totalLaborCost),
      totalCost: Math.round(totalCost),
      profit: Math.round(profit),
      sellingPrice: Math.round(sellingPrice),
      workDays: Math.round(workDays * 10) / 10,
      materialCostPerLinearMeter: Math.round(materialCostPerLinearMeter),
      laborCostPerLinearMeter: Math.round(laborCostPerLinearMeter),
      costPerLinearMeter: Math.round(costPerLinearMeter),
      sellingPricePerLinearMeter: Math.round(sellingPricePerLinearMeter),
      panelLaborWorkCapacity,
      panelUtilizationPercent,
      tileMaterialCostPerSqM
    };

  } catch (error) {
    console.error('Error calculating panel costs:', error);
    return {
      totalMaterialCost: 0,
      totalLaborCost: 0,
      totalCost: 0,
      profit: 0,
      sellingPrice: 0,
      workDays: 0,
      materialCostPerLinearMeter: 0,
      laborCostPerLinearMeter: 0,
      costPerLinearMeter: 0,
      sellingPricePerLinearMeter: 0
    };
  }
};

/**
 * פונקציה לבדיקה אם פריט ריצוף תומך בפאנל
 * @param {Object} tilingItem - פריט הריצוף
 * @returns {boolean} האם הפריט תומך בפאנל
 */
export const doesItemSupportPanel = (tilingItem) => {
  return tilingItem && tilingItem.hasPanel === true;
};

/**
 * פונקציה לקבלת הגדרות פאנל מפריט או מברירות מחדל
 * @param {Object} tilingItem - פריט הריצוף
 * @param {Object} userDefaults - ברירות מחדל של המשתמש
 * @returns {Object} הגדרות פאנל
 */
export const getPanelSettings = (tilingItem, userDefaults = {}) => {
  if (!tilingItem || !tilingItem.hasPanel) {
    return null;
  }

  return {
    panelLaborWorkCapacity: Number(tilingItem.panelLaborWorkCapacity || userDefaults.panelLaborWorkCapacity || 0),
    panelUtilizationPercent: Number(tilingItem.panelUtilizationPercent || userDefaults.panelUtilizationPercent || 0),
    hasValidSettings: function() {
      return this.panelLaborWorkCapacity > 0 && this.panelUtilizationPercent > 0 && this.panelUtilizationPercent <= 100;
    }
  };
};

/**
 * פונקציה לחישוב מהיר של מחיר פאנל ללא פירוט מלא
 * @param {Object} tilingItem - פריט הריצוף
 * @param {number} panelLinearMeters - כמות פאנל
 * @param {Object} userDefaults - ברירות מחדל
 * @returns {number} מחיר מכירה כולל
 */
export const calculatePanelQuickPrice = (tilingItem, panelLinearMeters, userDefaults = {}) => {
  const result = calculatePanelCosts(tilingItem, panelLinearMeters, userDefaults);
  return result.sellingPrice;
};
