
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote } from '@/lib/entities';
import { User } from '@/lib/entities';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Filter, BarChart3, Calendar, Users } from 'lucide-react';
import { addDays, addWeeks, format, startOfMonth, differenceInDays, isWithinInterval, startOfDay, addMonths } from 'date-fns';
import { he } from 'date-fns/locale'; // Added import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ProjectCashFlowChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [timeFilter, setTimeFilter] = useState('6months');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('approved');
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ 
    totalIncome: 0, 
    totalExpenses: 0, 
    netFlow: 0,
    activeProjects: 0 
  });
  const [activeProjects, setActiveProjects] = useState([]); // Added state

  useEffect(() => {
    const calculateProjectCashFlow = async () => {
      try {
        setLoading(true); // הפעל טעינה בכל ריענון
        const user = await User.me();
        if (!user || !user.email) {
          setLoading(false);
          return;
        }

        let quotesQuery = { created_by: user.email };
        
        // פילטר לפי סטטוס
        if (statusFilter === 'approved') {
          quotesQuery.status = 'אושר';
        } else if (statusFilter === 'sent') {
          quotesQuery.status = 'נשלח';
        }

        const allQuotes = await Quote.filter(quotesQuery);
        
        // יצירת רשימת פרויקטים לפילטר
        const projectList = allQuotes.map(quote => ({
          id: quote.id,
          name: quote.projectName || 'פרויקט ללא שם',
          clientName: quote.clientName
        }));
        setProjects(projectList);

        // סינון לפי פרויקט ספציפי
        const filteredQuotes = projectFilter === 'all' 
          ? allQuotes 
          : allQuotes.filter(quote => quote.id === projectFilter);
        
        setActiveProjects(filteredQuotes); // Update active projects based on filters

        // קביעת טווח זמן
        const today = startOfDay(new Date());
        let endDate;
        let monthsCount;
        
        switch (timeFilter) {
          case '3months':
            endDate = addMonths(today, 3);
            monthsCount = 3;
            break;
          case '6months':
            endDate = addMonths(today, 6);
            monthsCount = 6;
            break;
          case '1year':
            endDate = addMonths(today, 12);
            monthsCount = 12;
            break;
          default:
            endDate = addMonths(today, 6);
            monthsCount = 6;
        }
        
        // יצירת מערך חודשי
        const monthlyDataMap = new Map();
        for (let i = 0; i < monthsCount; i++) {
          const date = addMonths(today, i);
          const monthKey = format(startOfMonth(date), 'yyyy-MM');
          const monthName = format(date, 'MMM yy', { locale: he }); // Using he locale for month name
          
          monthlyDataMap.set(monthKey, {
            month: monthName,
            income: 0,
            expenses: 0,
            netFlow: 0,
            projects: []
          });
        }

        let totalIncomeSum = 0;
        let totalExpensesSum = 0;
        // activeProjectsCount removed as filteredQuotes.length is used directly

        filteredQuotes.forEach(quote => {
          const { 
            total_price = 0, 
            paymentTerms = [], 
            categoryTimings = {}, 
            items = [], 
            total_cost = 0,
            startDate: quoteStartDate, // תאריך התחלה מוגדר בהצעה
            created_at
          } = quote;
          
          const projectPaymentTerms = user.defaultPaymentTerms || paymentTerms;

          // חישוב הכנסות - רק עבור הצעות מאושרות
          if (quote.status === 'אושר' && projectPaymentTerms && projectPaymentTerms.length > 0) {
            let latestCategoryEndDate = new Date(0);
            Object.values(categoryTimings).forEach(timing => {
              if (timing.endDate) {
                const catEndDate = new Date(timing.endDate);
                if (catEndDate > latestCategoryEndDate) latestCategoryEndDate = catEndDate;
              }
            });

            const approvalDate = new Date(quote.created_at || today);
            const finalPaymentDate = addWeeks(latestCategoryEndDate, 1);

            projectPaymentTerms.forEach((term, index) => {
              let paymentDate;
              const paymentAmount = (total_price * term.percentage) / 100;
              
              if (index === 0) paymentDate = approvalDate;
              else if (index === projectPaymentTerms.length - 1) paymentDate = finalPaymentDate;
              else {
                  const daysBetween = differenceInDays(finalPaymentDate, approvalDate);
                  const daysForThisPayment = (daysBetween * index) / (projectPaymentTerms.length - 1);
                  paymentDate = addDays(approvalDate, Math.round(daysForThisPayment));
              }

              if (isWithinInterval(paymentDate, { start: today, end: endDate })) {
                const monthKey = format(startOfMonth(paymentDate), 'yyyy-MM');
                if (monthlyDataMap.has(monthKey)) {
                  const monthData = monthlyDataMap.get(monthKey);
                  monthData.income += paymentAmount;
                  if (!monthData.projects.includes(quote.projectName)) {
                    monthData.projects.push(quote.projectName);
                  }
                  totalIncomeSum += paymentAmount;
                }
              }
            });
          }
          
          // חישוב הוצאות - רק עבור הצעות מאושרות
          if (quote.status === 'אושר') {
            const totalProjectCost = total_cost;
            let distributedCost = 0;

            // חישוב הוצאות לפי קטגוריות ותאריכי עבודה בפועל
            Object.entries(categoryTimings).forEach(([categoryId, timing]) => {
              if (timing.startDate) {
                const categoryStartDate = new Date(timing.startDate); // תאריך התחלת הקטגוריה

                // סינון פריטים של הקטגוריה הזו
                const categoryItems = items.filter(item => item.categoryId === categoryId);
                const categoryTotalCost = categoryItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
                
                if (categoryTotalCost > 0) {
                  distributedCost += categoryTotalCost;

                  // בדיקה אם תאריך ההתחלה נמצא בטווח הגרף
                  if (isWithinInterval(categoryStartDate, { start: today, end: endDate })) {
                    const monthKey = format(startOfMonth(categoryStartDate), 'yyyy-MM');
                    if (monthlyDataMap.has(monthKey)) {
                      // הוספת כל עלות הקטגוריה לחודש בו מתחילה העבודה
                      monthlyDataMap.get(monthKey).expenses += categoryTotalCost;
                      totalExpensesSum += categoryTotalCost;
                    }
                  }
                }
              }
            });

            // אם יש עלות שלא חולקה (עלויות כלליות), נחלק אותה על כל התקופה
            const remainingCost = totalProjectCost - distributedCost;
            if (remainingCost > 0) {
              // קביעת תאריך התחלה לפיזור ההוצאות הכלליות
              let projectRealStartDate = new Date(today);
              
              // נסה למצוא את התאריך הקדום ביותר מהקטגוריות
              Object.values(categoryTimings).forEach(timing => {
                if (timing.startDate) {
                  const startDate = new Date(timing.startDate);
                  if (startDate < projectRealStartDate || projectRealStartDate.getTime() === today.getTime()) {
                    projectRealStartDate = startDate;
                  }
                }
              });

              // אם לא נמצא תאריך מהקטגוריות, השתמש בתאריך ההתחלה מההצעה
              if (projectRealStartDate.getTime() === today.getTime() && quoteStartDate) {
                projectRealStartDate = new Date(quoteStartDate);
              }

              // אם גם זה לא קיים, השתמש בתאריך יצירת ההצעה (כברירת מחדל אחרונה)
              if (projectRealStartDate.getTime() === today.getTime()) {
                projectRealStartDate = new Date(created_at || today);
              }

              let projectEndDate = new Date(projectRealStartDate);
              
              // מציאת תאריך סיום הפרויקט על בסיס הקטגוריות
              Object.values(categoryTimings).forEach(timing => {
                if (timing.endDate) {
                  const endDateTiming = new Date(timing.endDate);
                  if (endDateTiming > projectEndDate) {
                    projectEndDate = endDateTiming;
                  }
                }
              });

              // אם אין קטגוריות עם תאריכים, נניח פרויקט של 30 יום
              if (projectEndDate.getTime() === projectRealStartDate.getTime()) { // Only add 30 days if no end date was found beyond start date
                projectEndDate = addDays(projectRealStartDate, 30);
              }

              // חלוקת העלות הנותרת על ימי העבודה של הפרויכט כולו
              const projectWorkDays = [];
              for (let date = new Date(projectRealStartDate); date <= projectEndDate; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();
                if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday to Thursday (assuming Hebrew locale/Israeli work week)
                  projectWorkDays.push(new Date(date));
                }
              }

              if (projectWorkDays.length > 0) {
                const dailyRemainingCost = remainingCost / projectWorkDays.length;
                
                projectWorkDays.forEach(workDay => {
                  if (isWithinInterval(workDay, { start: today, end: endDate })) {
                    const monthKey = format(startOfMonth(workDay), 'yyyy-MM');
                    if (monthlyDataMap.has(monthKey)) {
                      monthlyDataMap.get(monthKey).expenses += dailyRemainingCost;
                      totalExpensesSum += dailyRemainingCost;
                    }
                  }
                });
              }
            }
          }
        });

        // חישוב תזרים נטו
        const finalData = Array.from(monthlyDataMap.values()).map(month => ({
          ...month,
          netFlow: month.income - month.expenses
        }));
        
        setChartData(finalData);
        setStats({
          totalIncome: totalIncomeSum,
          totalExpenses: totalExpensesSum,
          netFlow: totalIncomeSum - totalExpensesSum,
          activeProjects: filteredQuotes.length // Use length of filtered quotes
        });

      } catch (error) {
        console.error("Failed to calculate project cash flow:", error);
      } finally {
        setLoading(false);
      }
    };
    
    calculateProjectCashFlow(); // טעינה ראשונית ובעת שינוי פילטר

    // הוספת מאזין אירועים לריענון אוטומטי כשהמשתמש חוזר לחלון
    window.addEventListener('focus', calculateProjectCashFlow);

    // ניקוי המאזין לפני ריצה מחדש או כשהרכיב יורד
    return () => {
        window.removeEventListener('focus', calculateProjectCashFlow);
    };
  }, [timeFilter, projectFilter, statusFilter]);

  const formatCurrency = (value) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
    return `${Math.round(value)}`;
  };
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 mb-2">{`${label}`}</p>
          {payload.map((p, i) => (
             <p key={i} className="text-sm mb-1" style={{ color: p.color }}>
               {`${p.name}: ${Math.round(p.value).toLocaleString()} ₪`}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const statCards = [
    { 
      title: "פרויקטים פעילים", 
      value: stats.activeProjects, 
      icon: Users, 
      color: "text-indigo-600", 
      bgColor: "bg-indigo-50",
      suffix: ""
    },
    { 
      title: "הכנסות צפויות", 
      value: stats.totalIncome, 
      icon: TrendingUp, 
      color: "text-green-600", 
      bgColor: "bg-green-50",
      suffix: " ₪"
    },
    { 
      title: "הוצאות צפויות", 
      value: stats.totalExpenses, 
      icon: TrendingDown, 
      color: "text-red-600", 
      bgColor: "bg-red-50",
      suffix: " ₪"
    },
    { 
      title: "תזרים נטו", 
      value: stats.netFlow, 
      icon: DollarSign, 
      color: stats.netFlow >= 0 ? "text-blue-600" : "text-orange-600", 
      bgColor: stats.netFlow >= 0 ? "bg-blue-50" : "bg-orange-50",
      suffix: " ₪"
    },
  ];

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="p-6 h-96 animate-pulse bg-gray-100 rounded-lg"></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              תזרים פיננסי - מגמות ארוכות טווח
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              מעקב אחר הכנסות והוצאות צפויות מפרויקטים פעילים
            </CardDescription>
          </div>
          
          {/* פילטרים */}
          <div className="flex flex-wrap gap-3">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="טווח זמן" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 חודשים</SelectItem>
                <SelectItem value="6months">6 חודשים</SelectItem>
                <SelectItem value="1year">שנה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">מאושרים</SelectItem>
                <SelectItem value="sent">נשלחו</SelectItem>
                <SelectItem value="all">הכל</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="פרויקט" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפרויקטים</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                קווים
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                עמודות
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* כרטיסי סטטיסטיקה */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className={`${stat.bgColor} border-0 shadow-md`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.suffix === " ₪" ? 
                    `${Math.round(stat.value).toLocaleString()}${stat.suffix}` : 
                    `${stat.value}${stat.suffix}`
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* האלרט מצב */}
        {stats.activeProjects === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <Filter className="inline w-4 h-4 ml-1" />
              אין פרויקטים תואמים לפילטרים שנבחרו. נסה לשנות את הקריטריונים.
            </p>
          </div>
        )}
        
        {/* הגרף */}
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} unit="₪" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="הכנסות" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expenses" name="הוצאות" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="netFlow" name="תזרים נטו" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} unit="₪" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" name="הכנסות" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>אין נתונים להצגה בטווח הזמן הנבחר</p>
                <p className="text-sm mt-1">נסה לשנות את הפילטרים או להוסיף פרויקטים פעילים</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
