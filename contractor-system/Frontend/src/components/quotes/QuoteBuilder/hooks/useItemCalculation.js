import { useMemo, useCallback } from 'react';

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'קל', multiplier: 1.0, color: 'text-green-600' },
  { value: 'medium', label: 'בינוני', multiplier: 1.25, color: 'text-yellow-600' },
  { value: 'hard', label: 'קשה', multiplier: 1.5, color: 'text-orange-600' },
  { value: 'very_hard', label: 'קשה מאוד', multiplier: 2.0, color: 'text-red-600' }
];

export const useItemCalculation = (user, categoryType) => {
  const difficultyLevels = useMemo(() => DIFFICULTY_LEVELS, []);

  const calculatePrice = useCallback((item) => {
    switch (categoryType) {
      case 'demolition':
        return calculateDemolitionPrice(item, user, difficultyLevels);
      case 'electrical':
        return calculateElectricalPrice(item, user);
      // Add other category calculations as needed
      default:
        return item;
    }
  }, [user, difficultyLevels, categoryType]);

  return {
    calculatePrice,
    difficultyLevels
  };
};

const calculateDemolitionPrice = (item, user, difficultyLevels) => {
  const defaults = user?.demolitionDefaults || {};
  const difficultyData = difficultyLevels.find(d => d.value === item.difficultyLevel) || difficultyLevels[0];

  const baseHoursPerUnit = Number(item.baseHoursPerUnit || 1);
  const baseLaborCostPerDay = Number(item.baseLaborCostPerDay || defaults.laborCostPerDay || 1000);
  const baseProfitPercent = Number(item.baseProfitPercent || defaults.profitPercent || 40);
  const quantity = Number(item.quantity || 0);

  const adjustedHoursPerUnit = baseHoursPerUnit * difficultyData.multiplier;
  const hourlyRate = baseLaborCostPerDay / 8;

  const contractorCostPerUnit = hourlyRate * adjustedHoursPerUnit;
  const clientPricePerUnit = calculateClientPrice(contractorCostPerUnit, baseProfitPercent);

  return {
    ...item,
    unitPrice: Math.round(clientPricePerUnit),
    totalPrice: Math.round(clientPricePerUnit * quantity),
    workDuration: (adjustedHoursPerUnit * quantity) / 8
  };
};

const calculateElectricalPrice = (item, user) => {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const unitCost = Number(item.unitCost || 0);
  const profitPercent = Number(item.profitPercent || user?.electricalDefaults?.profitPercent || 0);

  const totalCost = unitCost * quantity;
  const totalPrice = unitPrice * quantity;

  return {
    ...item,
    totalCost,
    totalPrice,
    profit: totalPrice - totalCost,
    profitPercent
  };
};

const calculateClientPrice = (contractorCost, profitPercent) => {
  if (profitPercent >= 100) {
    return contractorCost * 2;
  }
  return contractorCost / (1 - (profitPercent / 100));
};
