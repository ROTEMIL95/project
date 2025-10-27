import React from "react";
import { X } from "lucide-react";

export default function ItemsDebugPanel({
  selectedCategories = [],
  currentCategoryForItems = null,
  effectiveCategoryId = null,
  categories = [],
  selectedItems = [],
  processedCategories = [],
  categoryTimings = {},
  currentStep = null, // NEW
  currentCategoryItemsCount = 0, // NEW
  totalItemsCount = 0, // NEW
  onSelectCategory,
  onClose
}) {
  const catName = (id) => categories.find((c) => c.id === id)?.name || id || "—";

  const countsByCat = selectedItems.reduce((acc, it) => {
    const k = it.categoryId || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const timingsKeys = Object.keys(categoryTimings || {});
  const isValid = !!effectiveCategoryId && selectedCategories.includes(effectiveCategoryId);

  // sample up to 3 items for quick glance (ids + category)
  const sampleItems = selectedItems.slice(0, 3).map((it) => ({
    id: it.id,
    cat: it.categoryId,
    qty: it.quantity,
    unit: it.unit,
    price: it.totalPrice
  }));

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:left-4 sm:right-auto sm:w-[360px] z-[60]">
      <div className="m-3 rounded-xl border bg-white/95 backdrop-blur shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="text-sm font-semibold text-gray-800">Items Debug Panel</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-3 text-xs text-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-gray-50 border">
              <div className="text-[11px] text-gray-500">Effective Category</div>
              <div className="font-mono">{effectiveCategoryId || "null"}</div>
              <div className="text-[11px]">{catName(effectiveCategoryId)}</div>
            </div>
            <div className="p-2 rounded bg-gray-50 border">
              <div className="text-[11px] text-gray-500">Current Category</div>
              <div className="font-mono">{currentCategoryForItems || "null"}</div>
              <div className="text-[11px]">{catName(currentCategoryForItems)}</div>
            </div>
          </div>

          <div className={`p-2 rounded border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="text-[11px] font-semibold">{isValid ? 'Valid selection' : 'Invalid selection'}</div>
            {!isValid && (
              <div className="mt-1">
                הערה: הקטגוריה הנוכחית אינה קיימת ברשימת הקטגוריות הנבחרות. נעשה שימוש בקטגוריה הראשונה הזמינה.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-gray-50 border">
              <div className="text-[11px] text-gray-500">Current Step</div>
              <div className="font-mono">{currentStep}</div>
            </div>
            <div className="p-2 rounded bg-gray-50 border">
              <div className="text-[11px] text-gray-500">Items (total / in category)</div>
              <div className="font-mono">{totalItemsCount} / {currentCategoryItemsCount}</div>
            </div>
          </div>

          <div className="p-2 rounded bg-gray-50 border">
            <div className="text-[11px] text-gray-500 mb-1">Selected Categories</div>
            <div className="flex flex-wrap gap-1">
              {selectedCategories.length === 0 ? (
                <span className="text-gray-400">—</span>
              ) : selectedCategories.map((id) => (
                <button
                  key={id}
                  onClick={() => onSelectCategory && onSelectCategory(id)}
                  className={`px-2 py-0.5 rounded border text-[11px] ${id === effectiveCategoryId ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white hover:bg-gray-50'}`}
                  title="בחר קטגוריה זו"
                >
                  {catName(id)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 rounded bg-gray-50 border">
            <div className="text-[11px] text-gray-500 mb-1">Items count by category</div>
            <div className="space-y-1">
              {Object.keys(countsByCat).length === 0 ? (
                <div className="text-gray-400">—</div>
              ) : (
                Object.entries(countsByCat).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span>{catName(k)}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-2 rounded bg-gray-50 border">
            <div className="text-[11px] text-gray-500 mb-1">Processed Categories</div>
            <div className="font-mono break-words">{JSON.stringify(processedCategories)}</div>
          </div>

          <div className="p-2 rounded bg-gray-50 border">
            <div className="text-[11px] text-gray-500 mb-1">Category Timings (keys)</div>
            <div className="font-mono break-words">{JSON.stringify(timingsKeys)}</div>
          </div>

          <div className="p-2 rounded bg-gray-50 border">
            <div className="text-[11px] text-gray-500 mb-1">Sample items (first 3)</div>
            <pre className="font-mono text-[11px] whitespace-pre-wrap break-words">
{JSON.stringify(sampleItems, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}