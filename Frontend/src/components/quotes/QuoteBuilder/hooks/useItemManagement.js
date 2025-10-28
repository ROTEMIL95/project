import { useState, useCallback } from 'react';
import { useItemCalculation } from './useItemCalculation';

export const useItemManagement = (user, categoryType) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { calculatePrice } = useItemCalculation(user, categoryType);

  const addItem = useCallback((item) => {
    const newItem = {
      id: `${item.id}_${Date.now()}`,
      name: item.name,
      description: item.description || item.name,
      unit: item.unit,
      quantity: 1,
      ...getDefaultsByCategory(categoryType, user),
      ...item
    };

    const calculatedItem = calculatePrice(newItem);
    setSelectedItems(prev => [...prev, calculatedItem]);
  }, [calculatePrice, categoryType, user]);

  const updateItem = useCallback((id, field, value) => {
    setSelectedItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (shouldRecalculatePrice(field, categoryType)) {
            return calculatePrice(updatedItem);
          }
          return updatedItem;
        }
        return item;
      });
      return updatedItems;
    });
  }, [calculatePrice, categoryType]);

  const removeItem = useCallback((idToRemove) => {
    setSelectedItems(prev => prev.filter(item => item.id !== idToRemove));
  }, []);

  const setInitialItems = useCallback((items) => {
    const calculatedItems = items.map(item => calculatePrice(item));
    setSelectedItems(calculatedItems);
  }, [calculatePrice]);

  return {
    selectedItems,
    isLoading,
    setIsLoading,
    addItem,
    updateItem,
    removeItem,
    setInitialItems
  };
};

const getDefaultsByCategory = (categoryType, user) => {
  switch (categoryType) {
    case 'demolition':
      return {
        difficultyLevel: 'easy',
        baseLaborCostPerDay: user?.demolitionDefaults?.laborCostPerDay || 1000,
        baseProfitPercent: user?.demolitionDefaults?.profitPercent || 40
      };
    case 'electrical':
      return {
        profitPercent: user?.electricalDefaults?.profitPercent || 0
      };
    default:
      return {};
  }
};

const shouldRecalculatePrice = (field, categoryType) => {
  const recalculateFields = {
    demolition: ['quantity', 'difficultyLevel', 'baseLaborCostPerDay', 'baseProfitPercent'],
    electrical: ['quantity', 'unitPrice', 'unitCost', 'profitPercent']
  };

  return recalculateFields[categoryType]?.includes(field) || false;
};
