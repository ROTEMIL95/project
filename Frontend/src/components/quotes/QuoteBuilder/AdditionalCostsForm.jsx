
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, ArrowRight, Calculator, Edit2, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { User } from '@/lib/entities';

const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const defaultCosts = [
    { id: 'logistics_transport', description: 'שינוע חומרים ופסולת', contractorCost: 0, cost: 0, isFixed: true, color: 'green' },
    { id: 'logistics_crane', description: 'מנוף או הרמה מכנית', contractorCost: 0, cost: 0, isFixed: true, color: 'blue' },
    { id: 'cleaning', description: 'ניקיון כללי', contractorCost: 0, cost: 0, isFixed: true, color: 'purple' },
];

export default function AdditionalCostsForm({ projectComplexities = {}, onUpdateProjectComplexities, onBack, onNext }) {
    const [userDefaults, setUserDefaults] = useState(null);
    const [loadingDefaults, setLoadingDefaults] = useState(true);
    
    const initializeCosts = () => {
        const existingCosts = projectComplexities.additionalCostDetails || [];
        
        // טען ברירות מחדל מהמשתמש אם קיימות
        const profitPercent = userDefaults?.profitPercent || 20;
        const userFixedCosts = userDefaults?.fixedCosts || [];
        
        // ודא שכל העלויות הקבועות קיימות
        const updatedCosts = defaultCosts.map(defaultCost => {
            const existing = existingCosts.find(c => c.id === defaultCost.id);
            const userDefault = userFixedCosts.find(c => c.id === defaultCost.id);
            
            if (existing) {
                // אם יש כבר נתונים קיימים בהצעה, השתמש בהם
                return { 
                    ...defaultCost, 
                    contractorCost: existing.contractorCost || 0,
                    cost: existing.cost || 0,
                    isEditing: false 
                };
            } else if (userDefault && userDefault.contractorCost > 0) {
                // אם יש ברירת מחדל מהמשתמש, השתמש בה
                const contractorCost = Number(userDefault.contractorCost) || 0;
                const calculatedCost = Math.round(contractorCost * (1 + profitPercent / 100));
                return { 
                    ...defaultCost, 
                    contractorCost: contractorCost,
                    cost: calculatedCost,
                    isEditing: false 
                };
            } else {
                // אין נתונים קיימים ואין ברירת מחדל
                return { ...defaultCost, isEditing: false };
            }
        });

        // הוסף עלויות מותאמות אישית קיימות
        const customCosts = existingCosts.filter(c => !defaultCosts.some(dc => dc.id === c.id));
        
        return [...updatedCosts, ...customCosts.map(c => ({...c, isEditing: false}))];
    };

    const [additionalCosts, setAdditionalCosts] = useState([]);

    // טעינת ברירות מחדל מהמשתמש
    useEffect(() => {
        const loadDefaults = async () => {
            try {
                setLoadingDefaults(true);
                const user = await User.me();
                const defaults = user?.additionalCostDefaults || {
                    profitPercent: 20,
                    fixedCosts: []
                };
                setUserDefaults(defaults);
            } catch (error) {
                console.error("Error loading user defaults:", error);
                setUserDefaults({ profitPercent: 20, fixedCosts: [] });
            } finally {
                setLoadingDefaults(false);
            }
        };
        loadDefaults();
    }, []);

    // אתחול העלויות לאחר טעינת ברירות המחדל
    useEffect(() => {
        if (!loadingDefaults && userDefaults) {
            setAdditionalCosts(initializeCosts());
        }
    }, [loadingDefaults, userDefaults, projectComplexities.additionalCostDetails]);

    useEffect(() => {
        if (onUpdateProjectComplexities && additionalCosts.length > 0) {
            const costsToSave = additionalCosts.map(({ isEditing, ...rest }) => rest);
            const totalAdditionalCost = costsToSave.reduce((sum, cost) => sum + (cost.cost || 0), 0);

            onUpdateProjectComplexities(prevComplexities => ({
                ...prevComplexities,
                additionalCostDetails: costsToSave,
                totalAdditionalCost: totalAdditionalCost 
            }));
        }
    }, [additionalCosts, onUpdateProjectComplexities]);

    const handleUpdateCost = (index, field, value) => {
        const newCosts = [...additionalCosts];
        const profitPercent = userDefaults?.profitPercent || 20;
        
        if (field === 'contractorCost') {
            const contractorCost = Number(value) || 0;
            newCosts[index] = { 
                ...newCosts[index], 
                contractorCost: contractorCost,
                // חישוב אוטומטי של מחיר לקוח
                cost: Math.round(contractorCost * (1 + profitPercent / 100))
            };
        } else if (field === 'cost') {
            // אפשר עדכון ידני של מחיר לקוח
            newCosts[index] = { 
                ...newCosts[index], 
                cost: Number(value) || 0
            };
        } else {
            newCosts[index] = { 
                ...newCosts[index], 
                [field]: value
            };
        }
        
        setAdditionalCosts(newCosts);
    };

    const toggleEditMode = (index) => {
        const newCosts = [...additionalCosts];
        if (newCosts[index].isFixed) return;
        newCosts[index].isEditing = !newCosts[index].isEditing;
        setAdditionalCosts(newCosts);
    };
    
    const handleAddCost = () => {
        const newCost = {
            id: `custom_${Date.now()}`,
            description: '',
            contractorCost: 0,
            cost: 0,
            isEditing: true,
            isFixed: false,
            color: 'gray'
        };
        setAdditionalCosts(prevCosts => [...prevCosts, newCost]);
    };
    
    const handleRemoveCost = (indexToRemove) => {
        const costToRemove = additionalCosts[indexToRemove];
        if (costToRemove.isFixed) return;
        const newCosts = additionalCosts.filter((_, index) => index !== indexToRemove);
        setAdditionalCosts(newCosts);
    };

    // חישובי סיכום
    const totalContractorCosts = additionalCosts.reduce((sum, cost) => sum + (cost.contractorCost || 0), 0);
    const totalClientCosts = additionalCosts.reduce((sum, cost) => sum + (cost.cost || 0), 0);
    const totalProfit = totalClientCosts - totalContractorCosts;
    const profitPercent = totalContractorCosts > 0 ? (totalProfit / totalContractorCosts * 100) : 0;

    const colorClasses = {
        green: { bg: 'bg-green-50/50', border: 'border-green-200' },
        blue: { bg: 'bg-blue-50/50', border: 'border-blue-200' },
        purple: { bg: 'bg-purple-50/50', border: 'border-purple-200' },
        gray: { bg: 'bg-gray-50/50', border: 'border-gray-200' }
    };

    if (loadingDefaults) {
        return (
            <Card className="shadow-lg bg-white">
                <CardContent className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">טוען הגדרות...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg bg-white">
            <CardHeader className="bg-gray-50/50 border-b">
                <CardTitle className="text-xl font-semibold text-gray-800">עלויות משתנות</CardTitle>
                <CardDescription className="text-gray-600">
                    הוסף וערוך עלויות לוגיסטיקה ושינוע לפי הצורך.
                    {userDefaults && userDefaults.profitPercent > 0 && (
                        <span className="block mt-1 text-green-600 font-medium">
                            💡 המחיר ללקוח מחושב אוטומטית עם {userDefaults.profitPercent}% רווח
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                
                {/* Dynamic Costs List */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-800">עלויות לוגיסטיקה ושינוע</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <AnimatePresence>
                            {additionalCosts.map((cost, index) => {
                                const colors = colorClasses[cost.color] || colorClasses.gray;
                                const profitMargin = (cost.cost || 0) - (cost.contractorCost || 0);
                                const profitPercentForItem = (cost.contractorCost || 0) > 0 
                                    ? ((profitMargin / cost.contractorCost) * 100).toFixed(1)
                                    : 0;
                                
                                return (
                                <motion.div
                                    key={cost.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`grid grid-cols-1 md:grid-cols-9 gap-4 p-4 rounded-lg border items-center ${colors.bg} ${colors.border}`}
                                >
                                    <div className="md:col-span-4 space-y-2">
                                        <Label className="text-xs text-gray-600">תיאור העלות</Label>
                                        {cost.isEditing && !cost.isFixed ? (
                                            <Input
                                                value={cost.description}
                                                onChange={(e) => handleUpdateCost(index, 'description', e.target.value)}
                                                className="text-sm"
                                                onBlur={() => toggleEditMode(index)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') toggleEditMode(index);
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <div 
                                                className={`text-sm font-medium text-gray-700 min-h-[40px] flex items-center p-2 rounded-md bg-white border border-gray-200 ${cost.isFixed ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                                                onClick={() => !cost.isFixed && toggleEditMode(index)}
                                            >
                                                {cost.isFixed && <Lock className="h-3 w-3 ml-2 text-gray-400" />}
                                                {cost.description || <span className="text-gray-400">לחץ לעריכת התיאור</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs text-gray-600">עלות קבלן (₪)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={cost.contractorCost}
                                            onChange={(e) => handleUpdateCost(index, 'contractorCost', e.target.value)}
                                            className={`text-sm ${(cost.contractorCost || 0) <= 0 ? 'border-red-400 focus:border-red-500 ring-red-500' : ''}`}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs text-gray-600">מחיר ללקוח (₪)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={cost.cost}
                                            onChange={(e) => handleUpdateCost(index, 'cost', e.target.value)}
                                            className={`text-sm font-medium ${(cost.cost || 0) <= 0 ? 'border-red-400 focus:border-red-500 ring-red-500' : ''}`}
                                        />
                                        {(cost.contractorCost || 0) > 0 && (cost.cost || 0) > 0 && (
                                            <p className="text-xs text-gray-500">
                                                רווח: {formatPrice(profitMargin)} ₪ ({profitPercentForItem}%)
                                            </p>
                                        )}
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center h-full">
                                        {!cost.isFixed && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveCost(index)}
                                                className="h-9 w-9 text-red-500 hover:bg-red-100 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                                );
                            })}
                        </AnimatePresence>

                         <Button 
                            onClick={handleAddCost} 
                            variant="outline" 
                            className="w-full mt-3 border-dashed border-gray-400 hover:bg-gray-100 text-gray-700 hover:text-gray-800"
                        >
                            <Plus className="h-4 w-4 ml-2" />
                            הוסף עלות מותאמת אישית
                        </Button>
                    </div>
                    
                    {/* סיכום עלויות עם 3 תאים צבעוניים */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* תא כחול - עלות ללקוח */}
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
                            <div className="text-sm font-medium text-blue-700 mb-1">מחיר ללקוח</div>
                            <div className="text-2xl font-bold text-blue-800">{formatPrice(totalClientCosts)} ₪</div>
                        </div>

                        {/* תא אדום - עלות קבלן */}
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-center">
                            <div className="text-sm font-medium text-red-700 mb-1">עלות קבלן</div>
                            <div className="text-2xl font-bold text-red-800">{formatPrice(totalContractorCosts)} ₪</div>
                        </div>

                        {/* תא ירוק - רווח */}
                        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                            <div className="text-sm font-medium text-green-700 mb-1">רווח צפוי</div>
                            <div className="text-2xl font-bold text-green-800">{formatPrice(totalProfit)} ₪</div>
                            <div className="text-xs text-green-600 mt-1">({profitPercent.toFixed(1)}%)</div>
                        </div>
                    </div>
                </div>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t p-4">
                <Button variant="outline" onClick={onBack} className="text-base px-6 py-2.5">
                    <ArrowRight className="ml-2 h-4 w-4" />
                    הקודם
                </Button>
                <Button onClick={onNext} className="text-base px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700">
                    הבא: סיכום סופי
                    <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
