import { get } from "lodash";

export const calculateExactPaintMetrics = (squareMeters, selectedLayers, item, roundUpBuckets = false) => {
    if (!item || !squareMeters || squareMeters <= 0 || !selectedLayers || selectedLayers <= 0) {
      return {
        materialCost: 0,
        laborCost: 0,
        equipmentCost: 0,
        totalCost: 0,
        customerPrice: 0,
        totalSellingPrice: 0,
        profit: 0,
        profitPercentage: 0,
        workDays: 0,
        totalBucketsNeeded: 0,
        costPerSqm: 0,
        pricePerSqm: 0
      };
    }
  
    const coverage = Number(get(item, 'coverage', 0));
    const dailyOutput = Number(get(item, 'dailyOutput', 0));
    const bucketPrice = Number(get(item, 'bucketPrice', 0)) || Number(get(item, 'materialCost', 0));
    const workerDailyCost = Number(get(item, 'workerDailyCost', 0)) || Number(get(item, 'laborCost', 0));
    const equipmentCost = Number(get(item, 'equipmentCost', 0)) || Number(get(item, 'additionalCost', 0));
    const desiredProfitPercent = Number(get(item, 'desiredProfitPercent', 0));
  
    if (coverage <= 0 || dailyOutput <= 0) {
      return {
        materialCost: 0, laborCost: 0, equipmentCost: 0, totalCost: 0, customerPrice: 0,
        totalSellingPrice: 0, profit: 0, profitPercentage: 0, workDays: 0, totalBucketsNeeded: 0, costPerSqm: 0, pricePerSqm: 0
      };
    }
  
    let totalBucketsNeeded = 0;
    let totalWorkDays = 0;
  
    for (let i = 0; i < selectedLayers; i++) {
        const layerCoverage = get(item, `layerSettings[${i}].coverage`, 0);
        const layerDiscount = get(item, `layerSettings[${i}].discountPercent`, 0);
        
        const effectiveCoverage = i === 0 ? coverage : coverage * (1 + layerCoverage / 100);
        const effectiveDailyOutput = i === 0 ? dailyOutput : dailyOutput * (1 + layerDiscount / 100);

        if(effectiveCoverage > 0) {
            totalBucketsNeeded += squareMeters / effectiveCoverage;
        }
        if(effectiveDailyOutput > 0) {
            totalWorkDays += squareMeters / effectiveDailyOutput;
        }
    }
    
    // NEW: Rounding logic for material cost calculation
    const bucketsToPurchase = roundUpBuckets ? Math.ceil(totalBucketsNeeded) : totalBucketsNeeded;
    const materialCost = bucketsToPurchase * bucketPrice;

    const laborCost = totalWorkDays * workerDailyCost;
  
    const totalCost = materialCost + laborCost + equipmentCost;
  
    const totalSellingPrice = totalCost * (1 + desiredProfitPercent / 100);
    const profit = totalSellingPrice - totalCost;
    const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const costPerSqm = squareMeters > 0 ? totalCost / squareMeters : 0;
    const pricePerSqm = squareMeters > 0 ? totalSellingPrice / squareMeters : 0;
  
    return {
      materialCost,
      laborCost,
      equipmentCost,
      totalCost,
      customerPrice: pricePerSqm, // This is price per meter
      totalSellingPrice,
      profit,
      profitPercentage,
      workDays: totalWorkDays,
      totalBucketsNeeded,
      costPerSqm,
      pricePerSqm
    };
};