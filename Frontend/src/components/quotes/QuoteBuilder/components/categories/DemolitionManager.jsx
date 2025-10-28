import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { CategoryHeader } from '../shared/CategoryHeader';
import { ItemList } from '../shared/ItemList';
import { useItemManagement } from '../../hooks/useItemManagement';
import { Hammer } from 'lucide-react';
import useSafeUser from "@/components/utils/useSafeUser";

export const DemolitionManager = forwardRef(({
  existingCategoryData,
  categoryId
}, ref) => {
  const { user } = useSafeUser();
  
  const {
    selectedItems,
    isLoading,
    setIsLoading,
    addItem,
    updateItem,
    removeItem,
    setInitialItems
  } = useItemManagement(user, 'demolition');

  useEffect(() => {
    if (existingCategoryData?.items?.length > 0) {
      setInitialItems(existingCategoryData.items);
    }
    setIsLoading(false);
  }, [existingCategoryData, setInitialItems, setIsLoading]);

  useImperativeHandle(ref, () => ({
    saveData: () => selectedItems
  }), [selectedItems]);

  if (isLoading) {
    return <div>טוען...</div>;
  }

  return (
    <div>
      <CategoryHeader
        categoryId={categoryId}
        title="הריסה ופינוי"
        description="בחר פריטים להריסה ופינוי והגדר את רמת המורכבות"
        icon={Hammer}
      />
      
      <ItemList
        items={selectedItems}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        categoryType="demolition"
      />
    </div>
  );
});
