
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '@/api/entities';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    isActive: true,
    categoryType: 'כללי', // Default category type
    tilingDefaults: {} // Default tiling defaults
  });
  const [editingCategory, setEditingCategory] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const allCategories = await Category.list();
      setCategories(allCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminAndFetch = async () => {
    try {
      const user = await User.me();
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      await loadCategories();
    } catch (error) {
      navigate(createPageUrl('Login'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAndFetch();
  }, []); // Removed 'navigate' from dependencies as per outline, relying on initial call

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, [name]: value });
    } else {
      setNewCategory({ ...newCategory, [name]: value });
    }
  };

  const handleTilingDefaultsChange = (e) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    const parsedValue = isNumber ? (value === '' ? null : Number(value)) : value;
    
    if (editingCategory) {
        setEditingCategory(prev => ({
            ...prev,
            tilingDefaults: {
                ...prev.tilingDefaults,
                [name]: parsedValue
            }
        }));
    } else {
        setNewCategory(prev => ({
            ...prev,
            tilingDefaults: {
                ...prev.tilingDefaults,
                [name]: parsedValue
            }
        }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, [name]: value });
    } else {
      setNewCategory({ ...newCategory, [name]: value });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      alert("יש להזין שם לקטגוריה.");
      return;
    }
    try {
      await Category.create(newCategory);
      setNewCategory({ name: '', description: '', isActive: true, categoryType: 'כללי', tilingDefaults: {} });
      await loadCategories();
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const handleUpdateCategory = async (category) => {
    try {
      await Category.update(category.id, category);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await Category.delete(categoryId);
      await loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const TilingDefaultsFields = ({ defaults, onChange }) => (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-4">
        <h4 className="font-semibold text-gray-800">ערכי ברירת מחדל לריצוף</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
                <Label htmlFor="tiling-laborCost">עלות עבודה יומית</Label>
                <Input id="tiling-laborCost" name="laborCost" type="number" value={defaults?.laborCost || ''} onChange={onChange} placeholder="לדוגמה: 1000"/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="tiling-dailyOutput">הספק עבודה יומי (מ"ר)</Label>
                <Input id="tiling-dailyOutput" name="dailyOutput" type="number" value={defaults?.dailyOutput || ''} onChange={onChange} placeholder="לדוגמה: 20"/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="tiling-materialCost">עלות חומרים בסיסית</Label>
                <Input id="tiling-materialCost" name="materialCost" type="number" value={defaults?.materialCost || ''} onChange={onChange} placeholder="לדוגמה: 50"/>
            </div>
             <div className="space-y-1">
                <Label htmlFor="tiling-complexityValue">מקדם מורכבות</Label>
                <Input id="tiling-complexityValue" name="complexityValue" type="number" step="0.1" value={defaults?.complexityValue || ''} onChange={onChange} placeholder="לדוגמה: 1.2"/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="tiling-wastagePercent">אחוז בלאי (%)</Label>
                <Input id="tiling-wastagePercent" name="wastagePercent" type="number" value={defaults?.wastagePercent || ''} onChange={onChange} placeholder="לדוגמה: 10"/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="tiling-customerPrice">מחיר מומלץ ללקוח</Label>
                <Input id="tiling-customerPrice" name="customerPrice" type="number" value={defaults?.customerPrice || ''} onChange={onChange} placeholder="לדוגמה: 250"/>
            </div>
        </div>
    </div>
  );

  if (loading) {
    return <div>טוען קטגוריות...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('AdminDashboard'))}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">ניהול קטגוריות</h1>
                <p className="text-gray-500">הוספה, עריכה ומחיקה של קטגוריות עבודה.</p>
            </div>
        </div>
        {/* The PlusCircle button and its functionality are replaced by the new "Add New Category" card */}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>הוספת קטגוריה חדשה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="שם הקטגוריה"
                name="name"
                value={newCategory.name}
                onChange={handleInputChange}
              />
              <Input
                placeholder="תיאור (אופציונלי)"
                name="description"
                value={newCategory.description}
                onChange={handleInputChange}
              />
              <Select value={newCategory.categoryType} onValueChange={(value) => handleSelectChange('categoryType', value)}>
                  <SelectTrigger>
                      <SelectValue placeholder="בחר סוג קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="כללי">כללי</SelectItem>
                      <SelectItem value="ריצוף וחיפוי">ריצוף וחיפוי</SelectItem>
                      <SelectItem value="צבע וטיח">צבע וטיח</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            {newCategory.categoryType === 'ריצוף וחיפוי' && (
                <TilingDefaultsFields defaults={newCategory.tilingDefaults} onChange={handleTilingDefaultsChange} />
            )}
            <Button onClick={handleCreateCategory}>הוסף קטגוריה</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קטגוריות קיימות</CardTitle>
          <CardDescription>
            רשימת כל קטגוריות העבודה במערכת.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.length === 0 ? (
                <p className="text-center text-gray-500">אין קטגוריות זמינות.</p>
            ) : (
                categories.map((category) => (
                <div key={category.id} className="p-4 border rounded-lg">
                    {editingCategory?.id === category.id ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            name="name"
                            value={editingCategory.name}
                            onChange={handleInputChange}
                            placeholder="שם קטגוריה"
                        />
                        <Input
                            name="description"
                            value={editingCategory.description}
                            onChange={handleInputChange}
                            placeholder="תיאור"
                        />
                        <Select value={editingCategory.categoryType} onValueChange={(value) => handleSelectChange('categoryType', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="בחר סוג קטגוריה" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="כללי">כללי</SelectItem>
                                <SelectItem value="ריצוף וחיפוי">ריצוף וחיפוי</SelectItem>
                                <SelectItem value="צבע וטיח">צבע וטיח</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                        {editingCategory.categoryType === 'ריצוף וחיפוי' && (
                            <TilingDefaultsFields defaults={editingCategory.tilingDefaults} onChange={handleTilingDefaultsChange} />
                        )}
                        <div className="flex gap-2">
                        <Button onClick={() => handleUpdateCategory(editingCategory)}>שמור</Button>
                        <Button variant="outline" onClick={() => setEditingCategory(null)}>ביטול</Button>
                        </div>
                    </div>
                    ) : (
                    <div className="flex justify-between items-center">
                        <div>
                        <h3 className="font-semibold">{category.name} <Badge variant="secondary">{category.categoryType}</Badge></h3>
                        <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                        <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setEditingCategory({ ...category, tilingDefaults: category.tilingDefaults || {} })}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
                                <AlertDialogDescription>
                                    האם אתה בטוח שברצונך למחוק את הקטגוריה "{category.name}"? פעולה זו אינה הפיכה.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>ביטול</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>מחק</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </div>
                    </div>
                    )}
                </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
