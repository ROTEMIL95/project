
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, X, Building, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper function to format prices to locale
const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * TilingInlineItemForm component allows editing a single tiling area's details.
 * It calculates costs, prices, and profit based on user's tiling items and defaults.
 *
 * @param {object} props
 * @param {object} props.area - The initial data for the tiling area being edited.
 * @param {number} props.areaIndex - The index of this area in a parent list (for display purposes).
 * @param {Array<object>} [props.allAreas=[]] - All areas managed by a parent (not directly used here, but for context).
 * @param {Array<object>} [props.userTilingItems=[]] - List of available tiling items from the user's catalog.
 * @param {function} props.onSave - Callback function to save the edited area data.
 * @param {function} props.onCancel - Callback function to cancel editing.
 * @param {function} props.onDelete - Callback function to delete the area.
 * @param {object} [props.userDefaults={}] - User-specific default values for calculations (e.g., wastage, profit).
 */
const TilingInlineItemForm = ({
    area,
    areaIndex,
    allAreas = [],
    userTilingItems = [],
    onSave,
    onCancel,
    onDelete,
    userDefaults = {}
}) => {
    // State to hold the form data for the current area
    const [formData, setFormData] = useState({
        workType: area?.workType || '', // New field: workType
        selectedTilingItemId: area?.selectedTilingItemId || '',
        quantity: area?.quantity || '',
        panelCatalogItemId: area?.panelCatalogItemId || '',
        customPanelPrice: area?.customPanelPrice || '',
        useCustomPanel: area?.useCustomPanel || false,
    });

    // State to hold validation errors
    const [errors, setErrors] = useState({});

    // UseMemo to extract unique work types from the user's tiling items
    const availableWorkTypes = useMemo(() => {
        if (!userTilingItems || userTilingItems.length === 0) return [];

        const workTypesSet = new Set();
        userTilingItems.forEach(item => {
            if (item.workType && Array.isArray(item.workType) && item.workType.length > 0) {
                // If workType is an array, take the first value
                workTypesSet.add(item.workType[0]);
            } else if (item.workType && typeof item.workType === 'string') {
                workTypesSet.add(item.workType);
            }
        });

        return Array.from(workTypesSet).sort();
    }, [userTilingItems]);

    // UseMemo to filter tiling items based on the selected work type
    const filteredTilingItems = useMemo(() => {
        if (!formData.workType) {
            return userTilingItems; // If no work type selected, show all
        }
        return userTilingItems.filter(item => {
            if (Array.isArray(item.workType)) {
                return item.workType.includes(formData.workType);
            }
            return item.workType === formData.workType;
        });
    }, [formData.workType, userTilingItems]);

    // UseMemo to calculate the price, cost, and profit for the current area
    const calculatedPrice = useMemo(() => {
        if (!formData.selectedTilingItemId || !formData.quantity) {
            return { totalPrice: 0, totalCost: 0, profit: 0, unitPrice: 0, actualProfitPercent: 0 };
        }

        const tilingItem = userTilingItems.find(item => item.id === formData.selectedTilingItemId);
        if (!tilingItem) {
            return { totalPrice: 0, totalCost: 0, profit: 0, unitPrice: 0, actualProfitPercent: 0 };
        }

        const qty = Number(formData.quantity) || 0;
        if (qty <= 0) {
            return { totalPrice: 0, totalCost: 0, profit: 0, unitPrice: 0, actualProfitPercent: 0 };
        }

        const materialCost = Number(tilingItem.materialCost) || 0;
        const laborCost = Number(tilingItem.laborCost) || 0;
        const additionalCost = Number(tilingItem.additionalCost) || 0;
        const wastagePercent = Number(tilingItem.wastagePercent) || (userDefaults.wastagePercent || 0);
        const profitPercent = Number(tilingItem.desiredProfitPercent) || (userDefaults.defaultProfitPercent || 30);

        let panelCostPerSqM = 0;
        // Logic for panel cost: Prioritize custom price if enabled, otherwise lookup catalog item
        if (formData.useCustomPanel && formData.customPanelPrice) {
            panelCostPerSqM = Number(formData.customPanelPrice) || 0;
        } else if (formData.panelCatalogItemId) {
            const panelItem = userTilingItems.find(item => item.id === formData.panelCatalogItemId);
            if (panelItem) {
                const panelMaterialCost = Number(panelItem.materialCost) || 0;
                const panelLaborCost = Number(panelItem.laborCost) || 0;
                const panelAdditionalCost = Number(panelItem.additionalCost) || 0;
                const panelWastagePercent = Number(panelItem.wastagePercent) || (userDefaults.wastagePercent || 0);

                const panelMaterialWithWastage = panelMaterialCost * (1 + panelWastagePercent / 100);
                panelCostPerSqM = panelMaterialWithWastage + panelLaborCost + panelAdditionalCost;
            }
        }

        const materialWithWastage = materialCost * (1 + wastagePercent / 100);
        const totalCostPerSqM = materialWithWastage + laborCost + additionalCost + panelCostPerSqM;
        const totalCost = totalCostPerSqM * qty;
        const totalPrice = totalCost * (1 + profitPercent / 100);
        const profit = totalPrice - totalCost;
        const unitPrice = qty > 0 ? totalPrice / qty : 0;
        const actualProfitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;


        return { totalPrice, totalCost, profit, unitPrice, actualProfitPercent };
    }, [formData, userTilingItems, userDefaults]);

    // Handles changes to form fields
    const handleChange = (field, value) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // If workType changes, reset selectedTilingItemId if current item is no longer valid for the new filter
            if (field === 'workType' && value !== prev.workType) {
                const currentSelectedItemValid = filteredTilingItems.some(item => item.id === prev.selectedTilingItemId);
                if (!value || !currentSelectedItemValid) {
                     newState.selectedTilingItemId = ''; // Reset if filter changes and item is no longer available
                }
            }
            return newState;
        });
        // Clear any previous error for the changed field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    // Validates the form data
    const validate = () => {
        let newErrors = {};
        if (!formData.selectedTilingItemId) {
            newErrors.selectedTilingItemId = 'חובה לבחור סוג ריצוף.';
        }
        if (!formData.quantity || Number(formData.quantity) <= 0 || isNaN(Number(formData.quantity))) {
            newErrors.quantity = 'חובה להזין כמות חיובית תקינה.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handles form submission
    const handleSubmit = () => {
        if (validate()) {
            const tilingItem = userTilingItems.find(item => item.id === formData.selectedTilingItemId);
            const itemToAdd = {
                id: area?.id || `tiling_area_${Date.now()}`, // Use existing ID or generate a new one
                source: 'tiling_inline_form',
                categoryId: 'cat_tiling',
                categoryName: 'ריצוף וחיפוי',
                description: `אזור • ${tilingItem?.name || 'פריט לא ידוע'}`,
                unit: 'מ"ר', // Assuming unit is always m2 for tiling
                ...formData, // Spread all form data
                // Add calculated prices, rounding them to integers
                totalPrice: Math.round(calculatedPrice.totalPrice),
                totalCost: Math.round(calculatedPrice.totalCost),
                profit: Math.round(calculatedPrice.profit),
                unitPrice: Math.round(calculatedPrice.unitPrice),
            };
            onSave(itemToAdd); // Call the onSave callback with the prepared item
        }
    };

    return (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50/30 to-white shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-l from-orange-100/50 to-transparent border-b border-orange-200">
                <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    אזור {areaIndex + 1}
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Row of input fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Work Type - New field */}
                    <div className="space-y-2">
                        <Label htmlFor={`workType-${area?.id || 'new'}`} className="text-sm font-medium text-gray-700">
                            סוג עבודה
                        </Label>
                        <Select
                            value={formData.workType || ''} // Ensure value is controlled (string or empty string)
                            onValueChange={(value) => handleChange('workType', value)}
                        >
                            <SelectTrigger id={`workType-${area?.id || 'new'}`} className="h-10">
                                <SelectValue placeholder="בחר סוג עבודה (אופציונלי)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={null}>הכל</SelectItem> {/* Option to show all work types */}
                                {availableWorkTypes.map(wt => (
                                    <SelectItem key={wt} value={wt}>
                                        {wt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Select Tiling Type */}
                    <div className="space-y-2">
                        <Label htmlFor={`selectedTilingItemId-${area?.id || 'new'}`} className="text-sm font-medium text-gray-700">
                            בחר סוג ריצוף <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={formData.selectedTilingItemId}
                            onValueChange={(value) => handleChange('selectedTilingItemId', value)}
                        >
                            <SelectTrigger id={`selectedTilingItemId-${area?.id || 'new'}`} className={`h-10 ${errors.selectedTilingItemId ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="בחר פריט מהמחירון..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredTilingItems.length === 0 ? (
                                    <SelectItem value="no_items" disabled>
                                        אין פריטים זמינים לסוג עבודה זה.
                                    </SelectItem>
                                ) : (
                                    filteredTilingItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name || item.itemName || 'ללא שם'}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {errors.selectedTilingItemId && (
                            <p className="text-xs text-red-600 mt-1">{errors.selectedTilingItemId}</p>
                        )}
                    </div>

                    {/* Quantity (sqm) */}
                    <div className="space-y-2">
                        <Label htmlFor={`quantity-${area?.id || 'new'}`} className="text-sm font-medium text-gray-700">
                            כמות (מ"ר) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id={`quantity-${area?.id || 'new'}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.quantity}
                            onChange={(e) => handleChange('quantity', e.target.value)}
                            placeholder="לדוגמה: 50"
                            className={`h-10 ${errors.quantity ? 'border-red-500' : ''}`}
                        />
                        {errors.quantity && (
                            <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>
                        )}
                    </div>

                    {/* Panel (if applicable) */}
                    <div className="space-y-2">
                        <Label htmlFor={`panelCatalogItemId-${area?.id || 'new'}`} className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            פאנל (פריט מחירון)
                            <Info className="w-3 h-3 text-gray-400" />
                        </Label>
                        {/* Panel selection from userTilingItems */}
                        <Select
                            value={formData.panelCatalogItemId}
                            onValueChange={(value) => handleChange('panelCatalogItemId', value)}
                            disabled={formData.useCustomPanel} // Disable if custom panel is used (though custom panel UI is not present)
                        >
                            <SelectTrigger id={`panelCatalogItemId-${area?.id || 'new'}`} className="h-10">
                                <SelectValue placeholder="בחר פאנל (אופציונלי)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={null}>ללא פאנל</SelectItem>
                                {userTilingItems.map(item => ( // Allow selecting any item as a panel for flexibility
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name || item.itemName || 'ללא שם'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Custom panel price inputs (commented out as per outline not specifying their UI) */}
                        {/* <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`useCustomPanel-${area?.id || 'new'}`}
                                checked={formData.useCustomPanel}
                                onCheckedChange={(checked) => handleChange('useCustomPanel', checked)}
                            />
                            <Label htmlFor={`useCustomPanel-${area?.id || 'new'}`}>מחיר פאנל מותאם אישית</Label>
                        </div>
                        {formData.useCustomPanel && (
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.customPanelPrice}
                                onChange={(e) => handleChange('customPanelPrice', e.target.value)}
                                placeholder="מחיר פאנל למ"ר"
                                className="h-10"
                            />
                        )} */}
                    </div>
                </div>

                {/* Summary boxes for the current area's calculation */}
                {(formData.selectedTilingItemId && formData.quantity && Number(formData.quantity) > 0) && (
                    <>
                        <Separator className="my-4 bg-orange-100" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="bg-white/60 rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">עלות קבלן</div>
                                <div className="text-lg font-bold text-gray-800">{formatPrice(calculatedPrice.totalCost)} ₪</div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3 border border-orange-300">
                                <div className="text-xs text-gray-600 mb-1">מחיר ללקוח</div>
                                <div className="text-lg font-bold text-orange-700">{formatPrice(calculatedPrice.totalPrice)} ₪</div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3 border border-green-300">
                                <div className="text-xs text-gray-600 mb-1">רווח צפוי</div>
                                <div className="text-lg font-bold text-green-700">{formatPrice(calculatedPrice.profit)} ₪</div>
                                {calculatedPrice.totalCost > 0 && (
                                    <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">
                                        {Math.round(calculatedPrice.actualProfitPercent)}% רווחיות
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </>
                )}


                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-2">
                    {onDelete && ( // Only show delete button if onDelete callback is provided
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onDelete}
                            className="text-red-600 hover:bg-red-50 border-red-300"
                        >
                            <Trash2 className="w-4 h-4 ml-1" />
                            מחק
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                    >
                        <X className="w-4 h-4 ml-1" />
                        ביטול
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmit}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        <Save className="w-4 h-4 ml-1" />
                        שמור אזור
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default TilingInlineItemForm;
