import React, { useState, useMemo } from 'react';
import { DemolitionManager } from './components/categories/DemolitionManager';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import useSafeUser from "@/components/utils/useSafeUser";

const ItemSelector = ({
  selectedItems,
  setSelectedItems,
  onAddItemToQuote,
  selectedCategories,
  setCurrentStep,
  AVAILABLE_CATEGORIES,
  currentCategoryForItems,
  setCurrentCategoryForItems,
  processedCategories,
  setProcessedCategories,
  categoryId,
  categoryTimings,
  onCategoryTimingChange,
  onProceed,
  projectComplexities,
  onUpdateRoomBreakdown,
  generalStartDate,
  generalEndDate,
  tilingWorkTypes = [],
  userTilingItems = [],
}) => {
  const { user, loading: isUserLoading } = useSafeUser();
  const [categoryRefs] = useState({});

  const currentCategory = useMemo(
    () => AVAILABLE_CATEGORIES.find(cat => cat.id === currentCategoryForItems),
    [AVAILABLE_CATEGORIES, currentCategoryForItems]
  );

  const handleSaveAndProceed = async () => {
    const currentRef = categoryRefs[currentCategoryForItems];
    if (currentRef?.saveData) {
      const savedData = await currentRef.saveData();
      setProcessedCategories(prev => ({
              ...prev,
        [currentCategoryForItems]: savedData
      }));
    }
    onProceed();
  };

  const renderCategoryComponent = () => {
    switch (currentCategoryForItems) {
      case 'cat_demolition':
        return (
          <DemolitionManager
            ref={ref => categoryRefs[currentCategoryForItems] = ref}
            existingCategoryData={processedCategories[currentCategoryForItems]}
            categoryId={categoryId}
          />
        );
      // Add other category components here
      default:
        return <div>קטגוריה לא נתמכת</div>;
    }
  };

  if (isUserLoading) {
    return <div>טוען...</div>;
  }

      return (
    <div className="space-y-6">
      {renderCategoryComponent()}

      <div className="flex justify-between mt-8">
                                <Button
                                  variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          חזור
                                </Button>

                                <Button
          onClick={handleSaveAndProceed}
          className="flex items-center gap-2"
        >
          המשך
          <ArrowLeft className="w-4 h-4" />
                                </Button>
                          </div>
                        </div>
  );
};

export default ItemSelector;