
import React, { useState, useEffect } from 'react';
import { ContractorPricing as ContractorPricingEntity } from '@/api/entities'; // Renamed to avoid conflict
import { User } from '@/api/entities';
import { useUser } from '@/components/utils/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Save, Edit, Wrench, Lightbulb, Hammer } from 'lucide-react';
import PlumbingSubcontractorManager from "@/components/contractorPricing/PlumbingSubcontractorManager";
import ElectricalSubcontractorManager from "@/components/contractorPricing/ElectricalSubcontractorManager";
import ConstructionSubcontractorManager from "@/components/contractorPricing/ConstructionSubcontractorManager";
import ContractorPricingLanding from "@/components/contractorPricing/ContractorPricingLanding";
import { useLocation, useNavigate } from "react-router-dom";
import CategorySwitcher from "@/components/common/CategorySwitcher";
import { createPageUrl } from "@/utils";

export default function ContractorPricing() { // Renamed component
  const { user } = useUser();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const activeTab = urlParams.get("tab"); // Renamed 'tab' to 'activeTab' for consistency with outline

  useEffect(() => {
    // Show landing for no tab, avoid loading base table
    if (!activeTab) {
      setPrices([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (activeTab !== "plumbing" && activeTab !== "electricity" && activeTab !== "construction") {
      loadPrices();
    } else {
      // Specific subcontractor tabs use their own managers and don't need the base prices list
      setPrices([]);
      setLoading(false);
      setError(null);
    }
  }, [activeTab]); // Dependency changed to activeTab

  const loadPrices = async () => {
    try {
      const pricingData = await ContractorPricingEntity.list(); // Using renamed entity
      setPrices(pricingData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading prices:", error);
      setError("שגיאה בטעינת המחירון");
      setLoading(false);
    }
  };

  const handleItemChange = (field, value) => {
    setEditingItem(prev => {
      if (!prev) return null;

      if (field.startsWith('layerPrice-')) {
        const layerIndex = parseInt(field.split('-')[1], 10);
        const updatedLayers = [...(prev.layerSettings || [])];
        if (updatedLayers[layerIndex]) {
          updatedLayers[layerIndex] = {
            ...updatedLayers[layerIndex],
            pricePercent: Number(value) || 0
          };
        }
        return { ...prev, layerSettings: updatedLayers };
      }

      if (field.startsWith('tier-')) {
        const [_, tierIndexStr, tierField] = field.split('-');
        const tierIndex = parseInt(tierIndexStr, 10);
        const updatedTiers = [...(prev.priceTiers || [])];
        if (updatedTiers[tierIndex]) {
          updatedTiers[tierIndex] = {
            ...updatedTiers[tierIndex],
            [tierField]: Number(value) || 0
          };
        }
        return { ...prev, priceTiers: updatedTiers };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
    setEditMode({ ...editMode, [item.id]: true });
  };

  const handleSave = async () => {
    if (!editingItem) {
      setError("אין פריט לעדכון.");
      return;
    }
    await ContractorPricingEntity.update(editingItem.id, { // Using renamed entity
      ...editingItem,
      lastUpdate: new Date().toISOString(),
      updatedBy: user?.email || 'מערכת'
    });

    setEditMode({ ...editMode, [editingItem.id]: false });
    setEditingItem(null);
    loadPrices();
  };

  const handleTabSelect = (category) => {
    if (category) {
      navigate(createPageUrl('ContractorPricingPage', { tab: category }));
    } else {
      navigate(createPageUrl('ContractorPricingPage')); // Navigate to base URL to remove tab
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative z-10">
        {/* Landing page when no tab is active */}
        {!activeTab && (
          <div className="space-y-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto" dir="rtl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">מחירון קבלן</h1>
                <p className="text-gray-500">בחר קטגוריה לניהול מחירון</p>
              </div>
            </div>
            <ContractorPricingLanding onSelectTab={handleTabSelect} />
          </div>
        )}

        {/* Plumbing tab content */}
        {activeTab === "plumbing" && (
          <div className="space-y-6" dir="rtl">
            {user?.categoryActiveMap?.cat_plumbing === false ? (
              <div className="space-y-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto" dir="rtl">
                <div className="text-center text-gray-600">
                  קטגוריית "אינסטלציה" כבויה בהגדרות המחירון.
                </div>
                <CategorySwitcher active={null} onSelectCategory={handleTabSelect} />
                <div className="flex justify-center">
                  <Button onClick={() => navigate(createPageUrl('PricebookSettings'))} className="bg-teal-600 hover:bg-teal-700">
                    פתח הגדרות מחירון
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Wrench className="w-6 h-6 text-teal-600" />
                    אינסטלציה — מחירון קבלן (קבלן משנה)
                  </h1>
                </div>
                <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
                  <CategorySwitcher active="plumbing" onSelectCategory={handleTabSelect} />
                </div>
                <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pt-8">
                  <PlumbingSubcontractorManager />
                </div>
              </>
            )}
          </div>
        )}

        {/* Electricity tab content */}
        {activeTab === "electricity" && (
          <div className="space-y-6" dir="rtl">
            {user?.categoryActiveMap?.cat_electricity === false ? (
              <div className="space-y-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto" dir="rtl">
                <div className="text-center text-gray-600">
                  קטגוריית "חשמל" כבויה בהגדרות המחירון.
                </div>
                <CategorySwitcher active={null} onSelectCategory={handleTabSelect} />
                <div className="flex justify-center">
                  <Button onClick={() => navigate(createPageUrl('PricebookSettings'))} className="bg-yellow-600 hover:bg-yellow-700">
                    פתח הגדרות מחירון
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-yellow-600" />
                    חשמל — מחירון קבלן (קבלן משנה)
                  </h1>
                </div>
                <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
                  <CategorySwitcher active="electricity" onSelectCategory={handleTabSelect} />
                </div>
                <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pt-8">
                  <ElectricalSubcontractorManager />
                </div>
              </>
            )}
          </div>
        )}

        {/* Construction tab content */}
        {activeTab === "construction" && (
          <div className="space-y-6" dir="rtl">
            {user?.categoryActiveMap?.cat_construction === false ? (
              <div className="space-y-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto" dir="rtl">
                <div className="text-center text-gray-600">
                  קטגוריית "בינוי" כבויה בהגדרות המחירון.
                </div>
                <CategorySwitcher active={null} onSelectCategory={handleTabSelect} />
                <div className="flex justify-center">
                  <Button onClick={() => navigate(createPageUrl('PricebookSettings'))} className="bg-purple-600 hover:bg-purple-700 text-white">
                    פתח הגדרות מחירון
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Hammer className="w-6 h-6 text-purple-600" />
                    בינוי — מחירון קבלן (קבלן משנה)
                  </h1>
                </div>
                <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
                  <CategorySwitcher active="construction" onSelectCategory={handleTabSelect} />
                </div>
                <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pt-8">
                  <ConstructionSubcontractorManager />
                </div>
              </>
            )}
          </div>
        )}

        {/* Base pricing table content (when a tab is active but not one of the specific subcontractor tabs) */}
        {activeTab && activeTab !== "plumbing" && activeTab !== "electricity" && activeTab !== "construction" && (
          <div className="space-y-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">מחירון קבלן</h1>
                <p className="text-gray-500">ניהול מחירון בסיס לכל הפרויקטים</p>
              </div>
            </div>

            <CategorySwitcher active={null} onSelectCategory={handleTabSelect} />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-3 text-gray-600">טוען נתונים...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {Object.entries(
                  prices.reduce((acc, item) => {
                    if (!acc[item.categoryId]) {
                      acc[item.categoryId] = [];
                    }
                    acc[item.categoryId].push(item);
                    return acc;
                  }, {})
                ).map(([categoryId, items]) => (
                  <Card key={categoryId}>
                    <CardHeader>
                      <CardTitle>{items[0]?.category || categoryId}</CardTitle>
                      <CardDescription>מחירי בסיס לקטגוריה</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>פריט</TableHead>
                            <TableHead>מחיר בסיס</TableHead>
                            <TableHead>עלות חומרים</TableHead>
                            <TableHead>עלות עבודה</TableHead>
                            <TableHead>משך זמן (ימים)</TableHead>
                            <TableHead>עדכון אחרון</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <React.Fragment key={item.id}>
                              <TableRow>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                  {editMode[item.id] ? (
                                    <Input
                                      type="number"
                                      value={editingItem?.basePrice ?? ''}
                                      onChange={(e) => handleItemChange('basePrice', e.target.value)}
                                      className="w-24"
                                    />
                                  ) : (
                                    `₪${item.basePrice}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editMode[item.id] ? (
                                    <Input
                                      type="number"
                                      value={editingItem?.materialCost ?? ''}
                                      onChange={(e) => handleItemChange('materialCost', e.target.value)}
                                      className="w-24"
                                    />
                                  ) : (
                                    `₪${item.materialCost}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editMode[item.id] ? (
                                    <Input
                                      type="number"
                                      value={editingItem?.laborCost ?? ''}
                                      onChange={(e) => handleItemChange('laborCost', e.target.value)}
                                      className="w-24"
                                    />
                                  ) : (
                                    `₪${item.laborCost}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editMode[item.id] ? (
                                    <Input
                                      type="number"
                                      value={editingItem?.duration ?? ''}
                                      onChange={(e) => handleItemChange('duration', e.target.value)}
                                      className="w-24"
                                    />
                                  ) : (
                                    item.duration
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-gray-500">
                                    {new Date(item.lastUpdate).toLocaleDateString('he-IL')}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {item.updatedBy}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {editMode[item.id] ? (
                                    <Button variant="ghost" size="sm" onClick={handleSave}>
                                      <Save className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
