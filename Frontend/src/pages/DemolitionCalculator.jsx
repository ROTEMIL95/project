
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CategorySwitcher from "@/components/common/CategorySwitcher";
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit, Plus, Settings, Loader2, Save } from 'lucide-react';

const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getProfitBadgeClass = (profitPercent) => {
    const num = parseFloat(profitPercent);
    if (isNaN(num) || num <= 0) return "bg-red-100 text-red-800";
    if (num < 25) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
};

// Default Settings Component
const DefaultSettingsCard = ({ settings, onUpdate, isLoading, onAddItem }) => {
    const [localSettings, setLocalSettings] = useState({
        laborCostPerDay: 1000,
        profitPercent: 40
    });

    useEffect(() => {
        if (settings) {
            setLocalSettings({
                laborCostPerDay: settings.laborCostPerDay || 1000,
                profitPercent: settings.profitPercent || 40
            });
        }
    }, [settings]);

    const handleSave = () => {
        onUpdate(localSettings);
    };

    // Updated UI to match toolbar style used in קבלן משנה
    return (
        <div className="relative overflow-hidden rounded-xl border bg-white p-3 mb-6">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-rose-500 to-rose-600" />
            <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
                <div className="w-full md:w-64">
                    <Label htmlFor="laborCost" className="text-xs text-gray-600">עלות יום עבודה (₪)</Label>
                    <Input
                        id="laborCost"
                        type="number"
                        value={localSettings.laborCostPerDay}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, laborCostPerDay: Number(e.target.value) }))}
                        className="text-right h-10"
                    />
                </div>
                <div className="w-full md:w-64">
                    <Label htmlFor="profitPercent" className="text-xs text-gray-600">אחוז רווח רצוי (%)</Label>
                    <Input
                        id="profitPercent"
                        type="number"
                        value={localSettings.profitPercent}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, profitPercent: Number(e.target.value) }))}
                        className="text-right h-10"
                    />
                </div>
                <div className="flex items-end justify-end gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="h-10 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                    >
                        {isLoading ? "שומר..." : "שמור הגדרות"}
                    </Button>
                    <Button
                        onClick={() => onAddItem && onAddItem()}
                        className="h-10 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                    >
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף פריט
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Demolition Item Form Component
const DemolitionItemForm = ({ isOpen, onClose, onSubmit, itemToEdit, defaults }) => {
    const isEditMode = !!itemToEdit;
    const [formData, setFormData] = useState({
        id: '', name: '', description: '', unit: 'יחידה', hoursPerUnit: 1
    });
    const [preview, setPreview] = useState({ contractorCost: 0, clientPrice: 0, profitAmount: 0 });

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                id: itemToEdit.id,
                name: itemToEdit.name || '',
                description: itemToEdit.description || '',
                unit: itemToEdit.unit || 'יחידה',
                hoursPerUnit: itemToEdit.hoursPerUnit || 1
            });
        } else {
            setFormData({
                id: `demolition_${Date.now()}`,
                name: '',
                description: '',
                unit: 'יחידה',
                hoursPerUnit: 1
            });
        }
    }, [itemToEdit, isEditMode, isOpen]);

    useEffect(() => {
        const laborCostPerDay = defaults?.laborCostPerDay || 1000;
        const profitPercent = defaults?.profitPercent || 40;
        const hoursPerUnit = formData.hoursPerUnit || 0;

        const contractorCost = (laborCostPerDay / 8) * hoursPerUnit;
        // Markup: price = cost * (1 + p%)
        const clientPrice = contractorCost * (1 + (profitPercent / 100));
        const profitAmount = clientPrice - contractorCost;

        setPreview({ contractorCost, clientPrice, profitAmount });
    }, [formData, defaults]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalItem = {
            ...formData,
            contractorCost: preview.contractorCost,
            clientPrice: preview.clientPrice,
            profitAmount: preview.profitAmount,
            profitPercent: defaults?.profitPercent || 40,
        };
        onSubmit(finalItem);
    };

    const isUnitDisabled = isEditMode || (formData.unit && formData.unit !== 'יחידה');

    // NEW: dynamic labels for hours field per selected unit
    const unit = formData.unit;
    const hoursLabel = unit === 'יחידה'
        ? 'שעות עבודה ליחידה'
        : unit === "מ'ר"
            ? 'שעות עבודה למ"ר'
            : unit === 'מטר רץ'
                ? 'שעות עבודה למטר רץ'
                : 'שעות עבודה ליחידה';
    const hoursHint = unit === 'יחידה'
        ? 'כמה שעות עבודה דרושות לביצוע יחידה אחת'
        : unit === "מ'ר"
            ? 'כמה שעות עבודה דרושות לכל מ"ר'
            : unit === 'מטר רץ'
                ? 'כמה שעות עבודה דרושות לכל מטר רץ'
                : 'כמה שעות עבודה דרושות לביצוע יחידה אחת';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Edit className="h-5 w-5 text-rose-600" />
                        {isEditMode ? "עריכת פריט הריסה" : "הוספת פריט הריסה חדש"}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="name" className="text-sm font-medium">שם הפריט <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="unit" className="text-sm font-medium">יחידת מידה <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.unit}
                                    onValueChange={value => setFormData({...formData, unit: value})}
                                    disabled={isUnitDisabled}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="יחידה">יחידה</SelectItem>
                                        <SelectItem value="מ'ר">מ"ר</SelectItem>
                                        <SelectItem value="מטר רץ">מטר רץ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="description" className="text-sm font-medium">תיאור</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="h-16"
                            />
                        </div>

                        {/* EDIT: remove worker daily cost field, keep only hours with dynamic label */}
                        <div className="grid grid-cols-1 gap-3 bg-gray-50 p-3 rounded-lg border">
                            <div className="space-y-1">
                                <Label htmlFor="hoursPerUnit" className="text-sm font-medium text-gray-700">
                                    {hoursLabel} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="hoursPerUnit"
                                    type="number"
                                    step="0.1"
                                    value={formData.hoursPerUnit}
                                    onChange={e => setFormData({...formData, hoursPerUnit: Number(e.target.value)})}
                                    required
                                    placeholder={unit === 'יחידה' ? 'שעות ליחידה' : unit === "מ'ר" ? 'שעות למ"ר' : 'שעות למטר'}
                                    className="h-9"
                                />
                                <p className="text-xs text-gray-500">{hoursHint}</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg border bg-gray-50">
                            <h4 className="text-center font-bold mb-3 text-sm">תצוגה מקדימה</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-red-100/60 p-2 rounded-lg">
                                    <p className="text-xs font-medium text-red-800">עלות לקבלן</p>
                                    <p className="text-lg font-bold text-red-900">₪{formatPrice(preview.contractorCost)}</p>
                                </div>
                                <div className="bg-blue-100/60 p-2 rounded-lg">
                                    <p className="text-xs font-medium text-blue-800">מחיר ללקוח</p>
                                    <p className="text-lg font-bold text-blue-900">₪{formatPrice(preview.clientPrice)}</p>
                                </div>
                                <div className="bg-green-100/60 p-2 rounded-lg">
                                    <p className="text-xs font-medium text-green-800">רווח ליחידה</p>
                                    <p className="text-lg font-bold text-green-900">₪{formatPrice(preview.profitAmount)}</p>
                                </div>
                            </div>
                            <p className="text-center text-xs mt-2 text-gray-600">* אחוז רווח: {defaults?.profitPercent}% (מהגדרות ברירת מחדל)</p>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                            <div className="flex gap-2">
                                <Button type="submit" className="bg-rose-500 hover:bg-rose-600">
                                    {isEditMode ? "עדכן פריט" : "הוסף פריט"}
                                </Button>
                                <Button type="button" variant="ghost" onClick={onClose}>ביטול</Button>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Main Component
export default function DemolitionCalculator() {
    const navigate = useNavigate();
    const [demolitionItems, setDemolitionItems] = useState([]);
    const [demolitionDefaults, setDemolitionDefaults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);

    const calculateItemMetrics = useCallback((item, defaults) => {
        const laborCostPerDay = defaults?.laborCostPerDay || 1000;
        const profitPercent = defaults?.profitPercent || 40;
        const hoursPerUnit = item.hoursPerUnit || 0;

        const contractorCost = (laborCostPerDay / 8) * hoursPerUnit;
        // Markup: price = cost * (1 + p%)
        const clientPrice = contractorCost * (1 + (profitPercent / 100));
        const profitAmount = clientPrice - contractorCost;

        return {
            ...item,
            contractorCost,
            clientPrice,
            profitAmount,
            profitPercent
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const user = await User.me();
                const defaults = user.demolitionDefaults || { laborCostPerDay: 1000, profitPercent: 40 };
                const items = user.demolitionItems || [];

                const itemsWithMetrics = items.map(item => calculateItemMetrics(item, defaults));

                setDemolitionItems(itemsWithMetrics);
                setDemolitionDefaults(defaults);
            } catch (error) {
                console.error("Error loading demolition data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [calculateItemMetrics]);

    const handleUpdateDefaults = async (newDefaults) => {
        setLoading(true);
        try {
            await User.updateMyUserData({ demolitionDefaults: newDefaults });
            setDemolitionDefaults(newDefaults);
            setDemolitionItems(prevItems => prevItems.map(item => calculateItemMetrics(item, newDefaults)));
        } catch (error) {
            console.error("Error updating defaults:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (item = null) => {
        setItemToEdit(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (itemData) => {
        setLoading(true);
        let updatedItems;
        if (demolitionItems.find(i => i.id === itemData.id)) {
            updatedItems = demolitionItems.map(i => i.id === itemData.id ? itemData : i);
        } else {
            updatedItems = [...demolitionItems, itemData];
        }

        try {
            // Remove calculated fields before saving to DB
            await User.updateMyUserData({ demolitionItems: updatedItems.map(({ contractorCost, clientPrice, profitAmount, profitPercent, ...rest }) => rest) });
            const itemsWithMetrics = updatedItems.map(item => calculateItemMetrics(item, demolitionDefaults));
            setDemolitionItems(itemsWithMetrics);
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsFormOpen(false);
            setItemToEdit(null);
            setLoading(false);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("האם אתה בטוח שברצונך למחוק פריט זה?")) return;
        setLoading(true);
        const updatedItems = demolitionItems.filter(i => i.id !== itemId);
        try {
            // Remove calculated fields before saving to DB
            await User.updateMyUserData({ demolitionItems: updatedItems.map(({ contractorCost, clientPrice, profitAmount, profitPercent, ...rest }) => rest) });
            setDemolitionItems(updatedItems);
        } catch (error) {
            console.error("Error deleting item:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && demolitionItems.length === 0) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8" dir="rtl">
            {/* סרגל ניווט אחוד עם 'בינוי' */}
            <CategorySwitcher active="demolition" />

            <div className="pt-8">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Trash2 className="h-7 w-7 text-red-500" />
                        מחירון הריסה ופינוי
                    </h1>
                    {/* removed header add button to avoid duplication - add button moved into settings toolbar */}
                </div>

                <DefaultSettingsCard
                    settings={demolitionDefaults}
                    onUpdate={handleUpdateDefaults}
                    isLoading={loading}
                    onAddItem={() => handleOpenForm(null)}
                />

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-600">שם הפריט</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">תיאור</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">יח"מ</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">עלות ליחידה</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">מחיר ללקוח</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">רווח ליחידה</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demolitionItems.map(item => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50/50">
                                            <td className="p-3 font-medium">{item.name}</td>
                                            <td className="p-3 text-gray-600 text-center">{item.description}</td>
                                            <td className="p-3 text-gray-600 text-center">{item.unit}</td>
                                            <td className="p-3 text-red-600 text-center font-mono">₪{formatPrice(item.contractorCost)}</td>
                                            <td className="p-3 text-blue-600 text-center font-mono font-semibold">₪{formatPrice(item.clientPrice)}</td>
                                            <td className="p-3 text-green-600 text-center font-mono font-semibold">₪{formatPrice(item.profitAmount)}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenForm(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDeleteItem(item.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {demolitionItems.length === 0 && !loading && (
                                <div className="text-center p-8 text-gray-500">
                                    <p>עדיין לא הוספת פריטים למחירון ההריסה.</p>
                                    <p className="text-sm">לחץ על "הוספת פריט" כדי להתחיל.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DemolitionItemForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                itemToEdit={itemToEdit}
                defaults={demolitionDefaults}
            />

            <Button
                onClick={() => handleOpenForm(null)}
                className="fixed bottom-8 left-8 z-50 h-16 w-16 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center"
            >
                <Plus className="h-8 w-8" />
            </Button>
        </div>
    );
}
