import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Quote } from '@/lib/entities';
import { useUser } from '@/components/utils/UserContext';
import QuoteToHTML from '@/components/quotes/QuoteToHTML';
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, Edit, Download } from 'lucide-react';

export default function QuoteView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuoteData = async () => {
      setLoading(true);
      setError(null);
      try {
        const urlParams = new URLSearchParams(location.search);
        const quoteId = urlParams.get('id');

        if (!quoteId) {
          setError("מזהה הצעת מחיר חסר.");
          setLoading(false);
          return;
        }

        if (!user || !user.id) {
          setError("נדרשת התחברות לצפייה בהצעה.");
          setLoading(false);
          return;
        }

        // Use getById instead of filter for direct ID lookup
        const fetchedQuote = await Quote.getById(quoteId);

        if (fetchedQuote) {
          setQuote(fetchedQuote);
        } else {
          setError("הצעת המחיר לא נמצאה או שאין לך הרשאה לצפות בה.");
        }
      } catch (err) {
        console.error("Error loading quote data:", err);
        setError("שגיאה בטעינת הצעת המחיר. נסה לרענן את העמוד.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuoteData();
  }, [user, location.search]); // Re-fetch when URL changes (different quote ID)

  const handleEdit = () => {
    navigate(createPageUrl(`QuoteCreate?id=${quote.id}`));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-4 text-lg text-gray-700">טוען את הצעת המחיר...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-xl text-red-700 font-semibold">{error}</p>
            <Button onClick={() => navigate(createPageUrl('SentQuotes'))} className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              חזור לרשימת ההצעות
            </Button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
             <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-4 text-xl text-gray-600">לא נמצאה הצעת מחיר.</p>
                 <Button onClick={() => navigate(createPageUrl('SentQuotes'))} className="mt-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    חזור לרשימת ההצעות
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="bg-white rounded-t-lg shadow-md p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">תצוגה מקדימה: {quote.projectName}</h2>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={handleEdit} className="ml-2">
                    <Edit className="mr-2 h-4 w-4" />
                    ערוך הצעה
                 </Button>
                 <Button variant="outline" onClick={() => navigate(createPageUrl(`ClientQuoteView?id=${quote.id}`))}>
                    <Download className="mr-2 h-4 w-4" />
                    הורדה/הדפסה
                 </Button>
                 <Button onClick={() => navigate(createPageUrl('SentQuotes'))}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    חזור לרשימה
                 </Button>
            </div>
        </div>
        <div className="bg-white p-4 shadow-lg rounded-b-lg">
            <QuoteToHTML quote={quote} />
        </div>
      </div>
    </div>
  );
}