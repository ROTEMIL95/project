
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Quote } from '@/lib/entities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, BarChart3, DollarSign, Target, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RevenueChart({ user }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Added error state
  const [chartType, setChartType] = useState('line');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    closingRate: 0,
    monthlyQuotes: 0
  });

  useEffect(() => {
    const fetchCombinedData = async () => {
      setLoading(true);
      setError(null); // Clear any previous errors
      try {
        if (user && user.email) {
          console.log("RevenueChart: Fetching quotes for user:", user.email);

          const allQuotes = await Quote.filter({});
          console.log("RevenueChart: Fetched quotes:", allQuotes.length);

          const approvedQuotes = allQuotes.filter((q) => q.status === 'approved');
          console.log('[RevenueChart] 📊 Approved quotes:', approvedQuotes.length);
          console.log('[RevenueChart] 📋 Full approved quotes data:', approvedQuotes);

          const totalRevenue = approvedQuotes.reduce((sum, quote) => {
            const revenue = quote.totalPrice || quote.finalAmount || quote.totalAmount || 0;
            console.log('[RevenueChart] 💵 Revenue for quote:', { id: quote.id, totalPrice: quote.totalPrice, finalAmount: quote.finalAmount, totalAmount: quote.totalAmount, revenue });
            return sum + revenue;
          }, 0);

          const totalProfit = approvedQuotes.reduce((sum, quote) => {
            const totalPrice = quote.totalPrice || quote.finalAmount || 0;
            const totalCost = quote.totalCost || quote.estimatedCost || 0;
            const profit = quote.profitAmount || (totalPrice - totalCost) || 0;

            console.log('[RevenueChart] 💰 Processing quote for profit:', {
              id: quote.id,
              profitAmount: quote.profitAmount,
              totalPrice: quote.totalPrice,
              finalAmount: quote.finalAmount,
              totalCost: quote.totalCost,
              estimatedCost: quote.estimatedCost,
              calculatedTotalPrice: totalPrice,
              calculatedTotalCost: totalCost,
              calculatedProfit: profit
            });

            return sum + Math.max(0, profit);
          }, 0);

          console.log('[RevenueChart] 📈 Total stats:', { totalRevenue, totalProfit });

          const sentQuotes = allQuotes.filter((q) => q.status === 'sent' || q.status === 'approved');
          const closingRate = sentQuotes.length > 0 ? approvedQuotes.length / sentQuotes.length * 100 : 0;

          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          const monthlyQuotes = allQuotes.filter((quote) => {
            const quoteDate = new Date(quote.createdAt);
            return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
          }).length;

          setStats({ totalRevenue, totalProfit, closingRate, monthlyQuotes });

          const monthlyData = {};
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });

            monthlyData[monthKey] = { month: monthName, revenue: 0, profit: 0 };
          }

          approvedQuotes.forEach((quote) => {
            const quoteDate = new Date(quote.createdAt);
            const monthKey = `${quoteDate.getFullYear()}-${String(quoteDate.getMonth() + 1).padStart(2, '0')}`;

            if (monthlyData[monthKey]) {
              const totalPrice = quote.totalPrice || quote.finalAmount || 0;
              const totalCost = quote.totalCost || quote.estimatedCost || 0;
              const profit = quote.profitAmount || (totalPrice - totalCost) || 0;

              monthlyData[monthKey].revenue += totalPrice;
              monthlyData[monthKey].profit += Math.max(0, profit);
            }
          });

          setChartData(Object.values(monthlyData));
        } else {
          setChartData([]);
          setStats({ totalRevenue: 0, totalProfit: 0, closingRate: 0, monthlyQuotes: 0 });
        }
      } catch (error) {
        console.error("RevenueChart: Failed to fetch financial data:", error);
        // Don't show error, just show empty state
        setChartData([]);
        setStats({ totalRevenue: 0, totalProfit: 0, closingRate: 0, monthlyQuotes: 0 });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchCombinedData();
      window.addEventListener('focus', fetchCombinedData);
      return () => window.removeEventListener('focus', fetchCombinedData);
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ₪`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ₪`;
    }
    return `${value.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₪`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800">{`${label}`}</p>
          {payload.map((entry, index) =>
          <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          )}
        </div>);

    }
    return null;
  };

  const statCards = [
  { title: "סה״כ הכנסות", value: formatCurrency(stats.totalRevenue), icon: <DollarSign className="h-6 w-6" />, description: "מהצעות שאושרו", color: "text-green-600", bgColor: "bg-green-50", iconBgColor: "bg-green-100" },
  { title: "רווח משוער", value: formatCurrency(stats.totalProfit), icon: <TrendingUp className="h-6 w-6" />, description: "מעסקאות סגורות", color: "text-blue-600", bgColor: "bg-blue-50", iconBgColor: "bg-blue-100" },
  { title: "אחוז סגירה", value: `${stats.closingRate.toFixed(1)}%`, icon: <Target className="h-6 w-6" />, description: "מהצעות שנשלחו", color: "text-purple-600", bgColor: "bg-purple-50", iconBgColor: "bg-purple-100" },
  { title: "הצעות החודש", value: stats.monthlyQuotes.toString(), icon: <FileText className="h-6 w-6" />, description: "יצרת החודש", color: "text-indigo-600", bgColor: "bg-indigo-50", iconBgColor: "bg-indigo-100" }];


  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-600">טוען נתונים פיננסיים...</p>
            </div>
          </div>
        </CardContent>
      </Card>);

  }

  if (error) {// Display error message if there's an error
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-2">⚠️</div>
              <p className="text-red-600">{error}</p>
              <p className="text-sm text-gray-500 mt-2">נסה לרענן את העמוד</p>
            </div>
          </div>
        </CardContent>
      </Card>);

  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              סקירה פיננסית ומגמות
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              סקירה כללית לצד מגמת הכנסות ורווח מהצעות מאושרות
            </CardDescription>
          </div>
          <div className="flex gap-2 self-start sm:self-center">
            <Button variant={chartType === 'line' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('line')}>
              <TrendingUp className="h-4 w-4 mr-1" />
              קווים
            </Button>
            <Button variant={chartType === 'bar' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('bar')}>
              <BarChart3 className="h-4 w-4 mr-1" />
              עמודות
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) =>
          <Card key={index} className={`${card.bgColor} border-0 shadow-lg hover:shadow-xl transition-shadow duration-300`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-slate-900 text-xl font-medium tracking-tight">{card.title}</CardTitle>
                <div className={`${card.iconBgColor} ${card.color} p-2 rounded-lg`}>{card.icon}</div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</div>
                <p className="text-xs text-gray-500">{card.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {chartData.length === 0 || chartData.every((item) => item.revenue === 0) ?
        <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין הצעות מאושרות להצגה בגרף</p>
              <p className="text-sm mt-1">הגרף יתעדכן כאשר יהיו לך הצעות מחיר שאושרו</p>
            </div>
          </div> :

        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ?
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrency} className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="הכנסות" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="profit" name="רווח" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart> :

            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrency} className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" name="הכנסות" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="רווח" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
            }
            </ResponsiveContainer>
          </div>
        }
      </CardContent>
    </Card>);

}