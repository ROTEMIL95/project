/**
 * Paint Calculation Utilities
 * 
 * Utility functions for calculating paint metrics and costs
 * Extracted from ItemSelector.jsx to fix Fast Refresh compatibility
 */

/**
 * Helper function to generate a display name for an item
 */
const getItemDisplayName = (item) => {
    if (!item) return "";

    // If itemName exists, use it
    if (item.itemName) return item.itemName;
    
    // If paintName exists, use it
    if (item.paintName) return item.paintName;
    
    // Fallback to id or empty string
    return item.id || "";
};

/**
 * Calculate exact paint metrics based on quantity, layers, and paint item properties.
 * 
 * This function computes material costs, labor costs, selling prices, profit, and work days
 * for a given paint/plaster item. It accounts for multiple layers with adjustable coverage
 * and daily output per layer.
 * 
 * @param {number} quantity - The area in square meters to be painted.
 * @param {number} layers - The number of paint layers to apply.
 * @param {object} paintItem - The paint/plaster item object with properties like bucketPrice, coverage, etc.
 * @param {boolean} [roundBuckets=false] - Whether to round up the total buckets needed for material cost.
 * @returns {object|null} - An object containing calculated metrics or null if inputs are invalid.
*/
export const calculateExactPaintMetrics = (quantity, layers, paintItem, roundBuckets = false) => {
  if (!paintItem || quantity <= 0) {
    return {
        materialCost: 0, laborCost: 0, otherCosts: 0, equipmentCost: 0,
        totalCost: 0, costPerMeter: 0, totalSellingPrice: 0, sellingPricePerMeter: 0,
        totalProfit: 0, profitPercentage: 0, totalWorkDays: 0, totalBucketsNeeded: 0,
        originalBucketsNeeded: 0, quantity: 0, itemId: paintItem?.id,
        itemName: paintItem?.itemName || paintItem?.paintName || getItemDisplayName(paintItem) || 'פריט לא מזוהה',
        bucketPrice: 0,
        bucketCapacity: paintItem?.bucketCapacity || 1
    };
  }

  const qty = Number(quantity);
  const numLayers = Number(layers);

  if (numLayers === 0) {
    const equipmentCost = Number(paintItem.equipmentCost || 0);
    const cleaningCostPerMeter = Number(paintItem.cleaningCostPerMeter || 0);
    const preparationCostPerMeter = Number(paintItem.preparationCostPerMeter || 0);
    const otherCosts = (qty * cleaningCostPerMeter) + (qty * preparationCostPerMeter);
    const totalCost = otherCosts + equipmentCost;
    const profitPercent = Number(paintItem.desiredProfitPercent || 0);
    const totalSellingPrice = totalCost * (1 + (profitPercent / 100));

    return {
        materialCost: 0,
        laborCost: 0,
        otherCosts: otherCosts,
        equipmentCost: equipmentCost,
        totalCost,
        costPerMeter: qty > 0 ? totalCost / qty : 0,
        totalSellingPrice,
        sellingPricePerMeter: qty > 0 ? totalSellingPrice / qty : 0,
        totalProfit: totalSellingPrice - totalCost,
        profitPercentage: profitPercent,
        totalWorkDays: 0,
        totalBucketsNeeded: 0,
        originalBucketsNeeded: 0,
        quantity: qty,
        itemId: paintItem.id,
        itemName: paintItem.itemName || paintItem.paintName || getItemDisplayName(paintItem) || 'פריט לא מזוהה',
        bucketPrice: 0,
        bucketCapacity: paintItem.bucketCapacity || 1
    };
  }

  // Base data from paint item
  const bucketPrice = Number(paintItem.bucketPrice || 0);
  const baseCoverage = Number(paintItem.coverage || 0);
  const workerDailyCost = Number(paintItem.workerDailyCost || 0);
  const baseDailyOutput = Number(paintItem.dailyOutput || 0);
  const equipmentCost = Number(paintItem.equipmentCost || 0);
  const cleaningCostPerMeter = Number(paintItem.cleaningCostPerMeter || 0);
  const preparationCostPerMeter = Number(paintItem.preparationCostPerMeter || 0);
  const profitPercent = Number(paintItem.desiredProfitPercent || 0);

  // Layer settings
  const layerSettings = paintItem.layerSettings || [];

  let exactTotalBucketsNeeded = 0;
  let totalWorkDays = 0;

  // Calculate for each layer
  for (let layer = 1; layer <= numLayers; layer++) {
    // Coverage for this layer
    let layerCoverage = baseCoverage;
    if (layer > 1 && layerSettings[layer - 1]) {
      const coverageAdjustment = layerSettings[layer - 1].coverage || 0;
      layerCoverage = baseCoverage * (1 + coverageAdjustment / 100);
    }

    // Daily output for this layer
    let layerDailyOutput = baseDailyOutput;
    if (layer > 1 && layerSettings[layer - 1]) {
      const outputAdjustment = layerSettings[layer - 1].dailyOutput || 0;
      layerDailyOutput = baseDailyOutput * (1 + outputAdjustment / 100);
    }

    // Calculate buckets and work days for this layer
    const bucketsForLayer = layerCoverage > 0 ? qty / layerCoverage : 0;
    const workDaysForLayer = layerDailyOutput > 0 ? qty / layerDailyOutput : 0;

    exactTotalBucketsNeeded += bucketsForLayer;
    totalWorkDays += workDaysForLayer;
  }

  // Apply rounding to buckets if requested for cost calculation
  const finalBucketsForCost = roundBuckets ? Math.ceil(exactTotalBucketsNeeded) : exactTotalBucketsNeeded;

  // Cost calculations
  const materialCost = finalBucketsForCost * bucketPrice;
  const laborCost = totalWorkDays * workerDailyCost;
  const otherCosts = (qty * cleaningCostPerMeter) + (qty * preparationCostPerMeter) + equipmentCost;
  const totalCost = materialCost + laborCost + otherCosts;

  // Pricing calculation
  const totalSellingPrice = totalCost * (1 + (profitPercent / 100));
  const sellingPricePerMeter = qty > 0 ? totalSellingPrice / qty : 0;
  const totalProfit = totalSellingPrice - totalCost;
  const costPerMeter = qty > 0 ? totalCost / qty : 0;

  return {
    materialCost,
    laborCost,
    otherCosts,
    equipmentCost,
    totalCost,
    costPerMeter,
    totalSellingPrice,
    sellingPricePerMeter,
    totalProfit,
    profitPercentage: profitPercent,
    totalWorkDays,
    totalBucketsNeeded: finalBucketsForCost,
    originalBucketsNeeded: exactTotalBucketsNeeded,
    quantity: qty,
    itemId: paintItem.id,
    itemName: paintItem.itemName || paintItem.paintName || getItemDisplayName(paintItem) || 'פריט לא מזוהה',
    bucketPrice: bucketPrice,
    bucketCapacity: paintItem.bucketCapacity || 1
  };
};

