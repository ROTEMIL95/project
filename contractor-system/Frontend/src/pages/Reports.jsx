
import React, { useState, useEffect } from 'react';
import { Project } from '@/lib/entities';
import { ProjectCosts } from '@/lib/entities';
import { Quote } from '@/lib/entities';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last3months');
  const [projectsData, setProjectsData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalProjects: 0,
    avgProfitMargin: 0,
    totalRevenue: 0,
    totalCosts: 0,
    profitableProjects: 0,
    nonProfitableProjects: 0
  });

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // טעינת כל הפרויקטים לפי התקופה הנבחרת
      const endDate = new Date();
      let startDate = new Date();
      
      switch(selectedPeriod) {
        case 'lastMonth':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'last3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'last6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case 'lastYear':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const projects = await Project.filter({
        startDate: { $gte: startDate.toISOString() }
      });

      // טעינת עלויות והצעות מחיר לכל פרויקט
      const projectsWithData = await Promise.all(projects.map(async (project) => {
        const costs = await ProjectCosts.filter({ projectId: project.id });
        const quote = await Quote.get(project.quoteId);
        
        const totalCosts = costs.reduce((sum, cost) => 
          sum + (cost.actualMaterialCost || 0) + (cost.actualLaborDays || 0) * (cost.workersCount || 0) * (cost.laborCostPerDay || 0), 
          0
        );
        
        const profitMargin = ((quote.totalAmount - totalCosts) / quote.totalAmount) * 100;
        
        return {
          ...project,
          totalCosts,
          quoteAmount: quote.totalAmount,
          profitMargin,
          profit: quote.totalAmount - totalCosts
        };
      }));

      // חישוב נתוני סיכום
      const summary = projectsWithData.reduce((acc, project) => ({
        totalProjects: acc.totalProjects + 1,
        totalRevenue: acc.totalRevenue + project.quoteAmount,
        totalCosts: acc.totalCosts + project.totalCosts,
        profitableProjects: acc.profitableProjects + (project.profitMargin > 0 ? 1 : 0),
        nonProfitableProjects: acc.nonProfitableProjects + (project.profitMargin <= 0 ? 1 : 0)
      }), {
        totalProjects: 0,
        totalRevenue: 0,
        totalCosts: 0,
        profitableProjects: 0,
        nonProfitableProjects: 0
      });

      summary.avgProfitMargin = ((summary.totalRevenue - summary.totalCosts) / summary.totalRevenue) * 100;

      setProjectsData(projectsWithData);
      setSummaryData(summary);
      setLoading(false);
    } catch (error) {
      console.error("Error loading report data:", error);
      setLoading(false);
    }
  };

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">דוחות וניתוח נתונים</h1>
          <p className="text-gray-500">ניתוח ביצועים והשוואות של פרויקטים</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="תקופה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastMonth">חודש אחרון</SelectItem>
              <SelectItem value="last3months">3 חודשים אחרונים</SelectItem>
              <SelectItem value="last6months">6 חודשים אחרונים</SelectItem>
              <SelectItem value="lastYear">שנה אחרונה</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            ייצוא לאקסל
          </Button>
        </div>
      </div>

      {/* כרטיסי סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">סה"כ פרויקטים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalProjects}</div>
            <div className="flex items-center mt-1 text-sm">
              <Badge className="bg-green-100 text-green-800">
                {summaryData.profitableProjects} רווחיים
              </Badge>
              <Badge className="bg-red-100 text-red-800 mr-2">
                {summaryData.nonProfitableProjects} לא רווחיים
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">רווח ממוצע</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData.avgProfitMargin.toFixed(1)}%
            </div>
            <div className="flex items-center mt-1">
              {summaryData.avgProfitMargin > 20 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">סה"כ הכנסות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₪{summaryData.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">סה"כ עלויות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₪{summaryData.totalCosts.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="profitability">ניתוח רווחיות</TabsTrigger>
          <TabsTrigger value="comparison">השוואת פרויקטים</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>התפלגות רווחיות</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart width={400} height={300}>
                  <Pie
                    data={[
                      { name: 'רווח גבוה (20%+)', value: projectsData.filter(p => p.profitMargin >= 20).length },
                      { name: 'רווח בינוני (10-20%)', value: projectsData.filter(p => p.profitMargin >= 10 && p.profitMargin < 20).length },
                      { name: 'רווח נמוך (0-10%)', value: projectsData.filter(p => p.profitMargin >= 0 && p.profitMargin < 10).length },
                      { name: 'הפסד', value: projectsData.filter(p => p.profitMargin < 0).length }
                    ]}
                    cx={200}
                    cy={150}
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>מגמת רווחיות לאורך זמן</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  width={500}
                  height={300}
                  data={projectsData.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="startDate" 
                    tickFormatter={(date) => format(new Date(date), 'MM/yyyy', { locale: he })}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="profitMargin" name="אחוז רווח" stroke="#4F46E5" />
                </LineChart>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profitability" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>ניתוח רווחיות לפי פרויקט</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                width={800}
                height={400}
                data={projectsData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quoteAmount" name="סכום הצעה" fill="#4F46E5" />
                <Bar dataKey="totalCosts" name="עלויות בפועל" fill="#EF4444" />
              </BarChart>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>השוואת פרויקטים</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם הפרויקט</TableHead>
                    <TableHead>הצעת מחיר</TableHead>
                    <TableHead>עלות בפועל</TableHead>
                    <TableHead>פער</TableHead>
                    <TableHead>אחוז רווח</TableHead>
                    <TableHead>סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsData.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>₪{project.quoteAmount.toLocaleString()}</TableCell>
                      <TableCell>₪{project.totalCosts.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {project.profit >= 0 ? <TrendingUp className="h-4 w-4 ml-1" /> : <TrendingDown className="h-4 w-4 ml-1" />}
                          ₪{Math.abs(project.profit).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          project.profitMargin >= 20 ? 'bg-green-100 text-green-800' :
                          project.profitMargin >= 10 ? 'bg-blue-100 text-blue-800' :
                          project.profitMargin >= 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {project.profitMargin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{project.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
