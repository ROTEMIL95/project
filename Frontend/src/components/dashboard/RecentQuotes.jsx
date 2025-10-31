
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Quote } from '@/lib/entities';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Eye, Edit, ChevronLeft, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function RecentQuotes({ user }) {
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Added error state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentQuotes = async () => {
      setLoading(true);
      setError(null); // Reset error on new fetch attempt
      try {
        if (user && user.email) {
          console.log("RecentQuotes: Fetching quotes for user:", user.email);

          // Check if Quote.filter is available
          if (typeof Quote.filter !== 'function') {
            console.log("RecentQuotes: Backend not connected, showing empty state.");
            setRecentQuotes([]);
            setLoading(false);
            return;
          }

          const quotes = await Quote.filter({ user_id: user.id });
          console.log("RecentQuotes: Fetched quotes:", quotes.length);
          setRecentQuotes(quotes);
        } else {
          setRecentQuotes([]);
        }
      } catch (error) {
        console.error("RecentQuotes: Failed to fetch recent quotes:", error);
        // Don't show error, just empty state
        setRecentQuotes([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRecentQuotes();
    } else {
      setLoading(false);
      setRecentQuotes([]);
    }
  }, [user]);

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'אושר': 'bg-green-100 text-green-800',
      'נשלח': 'bg-blue-100 text-blue-800',
      'טיוטה': 'bg-gray-100 text-gray-800',
      'נדחה': 'bg-red-100 text-red-800',
      'בוטל': 'bg-yellow-100 text-yellow-800',
    };
    return (
      <Badge className={cn("px-2 py-0.5 text-xs font-medium rounded-full", statusClasses[status] || statusClasses['טיוטה'])}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-gray-600">טוען הצעות מחיר...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) { // New error rendering block
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">הצעות מחיר אחרונות</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">נסה לרענן את העמוד</p>
        </CardContent>
      </Card>
    );
  }

  if (recentQuotes.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">הצעות מחיר אחרונות</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>עדיין לא יצרת הצעות מחיר.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            הצעות מחיר אחרונות
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            5 הצעות המחיר האחרונות שיצרת
          </CardDescription>
        </div>
        <Button variant="ghost" onClick={() => navigate(createPageUrl('SentQuotes'))}>
          הצג הכל <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50/80 rounded-lg text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-4">פרויקט</div>
            <div className="col-span-2 text-center">תאריך</div>
            <div className="col-span-2 text-center">סטטוס</div>
            <div className="col-span-2 text-center">סכום</div>
            <div className="col-span-1 text-center">רווח</div>
            <div className="col-span-1 text-center">פעולות</div>
          </div>

          {/* Quotes List */}
          {recentQuotes.map((quote) => {
            const profit = (quote.total_price || 0) - (quote.total_cost || 0);
            return (
              <div key={quote.id} className="p-3 rounded-lg hover:bg-gray-50/70 transition-colors border md:border-0 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                {/* Project Name (Mobile + Desktop) */}
                <div className="col-span-4 mb-2 md:mb-0">
                  <p className="font-semibold text-gray-800">{quote.projectName}</p>
                  <p className="text-sm text-gray-500">{quote.clientName}</p>
                </div>

                {/* Mobile Details Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:hidden border-t pt-3 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">תאריך</p>
                    <p className="font-medium">{format(new Date(quote.created_at), 'dd/MM/yy', { locale: he })}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500">סטטוס</p>
                    <div>{getStatusBadge(quote.status || 'טיוטה')}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">סכום</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(quote.total_price || 0)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500">רווח</p>
                    <p className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</p>
                  </div>
                </div>

                {/* Desktop Details */}
                <div className="hidden md:block col-span-2 text-center text-sm font-medium text-gray-700">
                  {format(new Date(quote.created_at), 'dd/MM/yy', { locale: he })}
                </div>
                <div className="hidden md:flex col-span-2 justify-center">
                  {getStatusBadge(quote.status || 'טיוטה')}
                </div>
                <div className="hidden md:block col-span-2 text-center text-sm font-bold text-indigo-600">
                  {formatCurrency(quote.total_price || 0)}
                </div>
                <div className={`hidden md:block col-span-1 text-center text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </div>

                {/* Actions (Mobile + Desktop) */}
                <div className="col-span-1 flex justify-end md:justify-center gap-1 mt-3 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(createPageUrl(`QuoteView?id=${quote.id}`))}>
                    <Eye className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(createPageUrl(`QuoteCreate?id=${quote.id}`))}>
                    <Edit className="h-4 w-4 text-indigo-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
