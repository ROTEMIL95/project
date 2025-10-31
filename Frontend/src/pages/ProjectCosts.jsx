
import React, { useState, useEffect } from 'react';
import { ProjectCosts } from '@/lib/entities';
import { Project } from '@/lib/entities';
import { ContractorPricing } from '@/lib/entities';
import { User } from '@/lib/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Save, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar
} from 'lucide-react';

export default function ProjectCostsPage() {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [costs, setCosts] = useState([]);
  const [baselinePrices, setBaselinePrices] = useState([]);
  const [summaryData, setSummaryData] = useState({
    estimatedTotal: 0,
    actualTotal: 0,
    difference: 0,
    totalWorkers: 0,
    totalDays: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // טעינת נתוני הפרויקט והעלויות
      const projectData = await Project.get(/* project id from url params */);
      const projectCosts = await ProjectCosts.filter({ projectId: projectData.id });
      const basePrices = await ContractorPricing.list();
      
      setProject(projectData);
      setCosts(projectCosts);
      setBaselinePrices(basePrices);
      calculateSummary(projectCosts);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // שמירת כל העדכונים בבת אחת
      const updatePromises = costs.map(cost => 
        ProjectCosts.update(cost.id, {
          estimatedMaterialCost: cost.estimatedMaterialCost,
          actualMaterialCost: cost.actualMaterialCost,
          estimatedLaborDays: cost.estimatedLaborDays,
          actualLaborDays: cost.actualLaborDays,
          workersCount: cost.workersCount,
          laborCostPerDay: cost.laborCostPerDay
        })
      );
      
      await Promise.all(updatePromises);
      loadData(); // רענון הנתונים
      
      // כאן אפשר להוסיף הודעת הצלחה
    } catch (error) {
      console.error("Error saving costs:", error);
      // כאן אפשר להוסיף הודעת שגיאה
    }
  };

  const calculateSummary = (costData) => {
    const summary = costData.reduce((acc, cost) => {
      const estimatedTotal = (cost.estimatedMaterialCost || 0) + 
        ((cost.estimatedLaborDays || 0) * (cost.workersCount || 0) * (cost.laborCostPerDay || 0));
      
      const actualTotal = (cost.actualMaterialCost || 0) + 
        ((cost.actualLaborDays || 0) * (cost.workersCount || 0) * (cost.laborCostPerDay || 0));

      return {
        estimatedTotal: acc.estimatedTotal + estimatedTotal,
        actualTotal: acc.actualTotal + actualTotal,
        totalWorkers: acc.totalWorkers + (cost.workersCount || 0),
        totalDays: acc.totalDays + (cost.actualLaborDays || cost.estimatedLaborDays || 0)
      };
    }, { estimatedTotal: 0, actualTotal: 0, totalWorkers: 0, totalDays: 0 });

    summary.difference = summary.estimatedTotal - summary.actualTotal;
    setSummaryData(summary);
  };

  const handleUpdateCost = async (costId, updates) => {
    try {
      await ProjectCosts.update(costId, updates);
      loadData(); // רענון הנתונים
    } catch (error) {
      console.error("Error updating cost:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* כותרת ופרטי פרויקט */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול עלויות - {project?.name}</h1>
          <p className="text-gray-500">השוואת עלויות מתוכננות מול ביצוע בפועל</p>
        </div>
        <Button onClick={() => handleSave()}>
          <Save className="h-4 w-4 ml-2" />
          שמירת שינויים
        </Button>
      </div>

      {/* סיכום נתונים */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">עלות מתוכננת</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{summaryData.estimatedTotal.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">עלות בפועל</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{summaryData.actualTotal.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">פער</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center ${
              summaryData.difference >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {summaryData.difference >= 0 ? 
                <TrendingUp className="h-5 w-5 mr-2" /> : 
                <TrendingDown className="h-5 w-5 mr-2" />
              }
              ₪{Math.abs(summaryData.difference).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">כוח אדם</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div>
                <Users className="h-5 w-5 text-gray-400" />
                <div className="text-lg">{summaryData.totalWorkers} פועלים</div>
              </div>
              <div>
                <Calendar className="h-5 w-5 text-gray-400" />
                <div className="text-lg">{summaryData.totalDays} ימים</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* טבלת עלויות */}
      <Card>
        <CardHeader>
          <CardTitle>פירוט עלויות לפי קטגוריות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>קטגוריה/פריט</TableHead>
                <TableHead>עלות חומרים מתוכננת</TableHead>
                <TableHead>עלות חומרים בפועל</TableHead>
                <TableHead>ימי עבודה מתוכננים</TableHead>
                <TableHead>ימי עבודה בפועל</TableHead>
                <TableHead>מספר פועלים</TableHead>
                <TableHead>עלות יום עבודה</TableHead>
                <TableHead>פער</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>{cost.categoryName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={cost.estimatedMaterialCost || ''}
                      onChange={(e) => handleUpdateCost(cost.id, { 
                        estimatedMaterialCost: Number(e.target.value) 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={cost.actualMaterialCost || ''}
                      onChange={(e) => handleUpdateCost(cost.id, { 
                        actualMaterialCost: Number(e.target.value) 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={cost.estimatedLaborDays || ''}
                      onChange={(e) => handleUpdateCost(cost.id, { 
                        estimatedLaborDays: Number(e.target.value) 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={cost.actualLaborDays || ''}
                      onChange={(e) => handleUpdateCost(cost.id, { 
                        actualLaborDays: Number(e.target.value) 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={cost.workersCount || ''}
                      onChange={(e) => handleUpdateCost(cost.id, { 
                        workersCount: Number(e.target.value) 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={cost.laborCostPerDay || ''}
                      onChange={(e) => handleUpdateCost(cost.id, { 
                        laborCostPerDay: Number(e.target.value) 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      cost.difference > 0 ? 'bg-green-100 text-green-800' : 
                      cost.difference < 0 ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }>
                      {cost.difference > 0 ? '+' : ''}{cost.difference}₪
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
