import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/components/utils/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2, Save, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const formatNumber = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const parseNumber = (value) => {
    if (value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

export default function PaintSettings() {
    const { user, loading: userLoading } = useUser();
    const [paintItems, setPaintItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userLoading) return;

        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            if (user && user.user_metadata?.paintItems && Array.isArray(user.user_metadata.paintItems)) {
                setPaintItems(user.user_metadata.paintItems);
            } else {
                setPaintItems([]);
            }
        } catch (err) {
            setError("שגיאה בטעינת נתוני המשתמש.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user, userLoading]);

    const handleAddItem = () => {
        setPaintItems(prevItems => [
            ...prevItems,
            {
                id: `new_${Date.now()}`,
                name: '',
                itemType: 'צבע',
                bucketPrice: null,
                coverage: null,
                workerDailyCost: null,
                dailyOutput: null,
                equipmentCost: null,
                preparationCostPerMeter: 0, // שדה חדש
                cleaningCostPerMeter: 0,    // שדה חדש
                priceTiers: [{ minQuantity: 0, maxQuantity: Infinity, customerPrice: null }]
            }
        ]);
    };

    const handleRemoveItem = (index) => {
        setPaintItems(prevItems => prevItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...paintItems];
        newItems[index][field] = value;
        setPaintItems(newItems);
    };

    const handleTierChange = (itemIndex, tierIndex, field, value) => {
        const newItems = [...paintItems];
        newItems[itemIndex].priceTiers[tierIndex][field] = value;
        setPaintItems(newItems);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await supabase.auth.updateUser({
                data: {
                    ...user.user_metadata,
                    paintItems
                }
            });
        } catch (err) {
            setError("שגיאה בשמירת הנתונים.");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8" dir="rtl">
            <Card className="max-w-4xl mx-auto shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">הגדרות מחירון צבע וטיח</CardTitle>
                    <CardDescription>נהל את פריטי הצבע והטיח שלך, כולל עלויות ותמחורים ללקוח.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <AnimatePresence>
                        {paintItems.map((item, index) => (
                            <motion.div
                                key={item.id || index}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                            >
                                <Card className="bg-gray-50/50 border">
                                    <CardHeader className="flex flex-row justify-between items-center">
                                        <Input
                                            placeholder="שם הפריט (לדוגמה: צבע אקרילי)"
                                            value={item.name || ''}
                                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                            className="text-lg font-semibold"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-4 border rounded-lg bg-blue-50/30 border-blue-200">
                                            <h4 className="font-semibold mb-3 text-blue-800">עלויות בסיס וחומרים</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <Label>מחיר לדלי (₪)</Label>
                                                    <Input type="number" placeholder="90" value={formatNumber(item.bucketPrice)} onChange={(e) => handleItemChange(index, 'bucketPrice', parseNumber(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>כושר כיסוי לדלי (מ"ר)</Label>
                                                    <Input type="number" placeholder="100" value={formatNumber(item.coverage)} onChange={(e) => handleItemChange(index, 'coverage', parseNumber(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>עלות ציוד קבועה (₪)</Label>
                                                    <Input type="number" placeholder="250" value={formatNumber(item.equipmentCost)} onChange={(e) => handleItemChange(index, 'equipmentCost', parseNumber(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 border rounded-lg bg-green-50/30 border-green-200">
                                            <h4 className="font-semibold mb-3 text-green-800">עלויות עבודה והכנה</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="space-y-1">
                                                    <Label>עלות פועל ליום (₪)</Label>
                                                    <Input type="number" placeholder="800" value={formatNumber(item.workerDailyCost)} onChange={(e) => handleItemChange(index, 'workerDailyCost', parseNumber(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>הספק פועל ליום (מ"ר)</Label>
                                                    <Input type="number" placeholder="15" value={formatNumber(item.dailyOutput)} onChange={(e) => handleItemChange(index, 'dailyOutput', parseNumber(e.target.value))} />
                                                </div>
                                                {/* שדות חדשים */}
                                                <div className="space-y-1">
                                                    <Label>עלות הכנה למ"ר (₪)</Label>
                                                    <Input type="number" placeholder="0" value={formatNumber(item.preparationCostPerMeter)} onChange={(e) => handleItemChange(index, 'preparationCostPerMeter', parseNumber(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>עלות ניקיון למ"ר (₪)</Label>
                                                    <Input type="number" placeholder="0" value={formatNumber(item.cleaningCostPerMeter)} onChange={(e) => handleItemChange(index, 'cleaningCostPerMeter', parseNumber(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Tier pricing can be added here if needed */}

                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <Button variant="outline" onClick={handleAddItem}>
                        <PlusCircle className="h-4 w-4 ml-2" />
                        הוסף פריט חדש
                    </Button>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    {error && <div className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 ml-2" />{error}</div>}
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span className="mr-2">שמור שינויים</span>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}