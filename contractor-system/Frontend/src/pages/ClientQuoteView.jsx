import React, { useState, useEffect } from 'react';
// import { Quote } from '@/lib/entities'; // REMOVED - Quote API will be rebuilt
import QuoteToHTML from '@/components/quotes/QuoteToHTML';
import { Loader2, AlertCircle, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClientQuoteView() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const quoteId = urlParams.get('id');

        if (!quoteId) {
          setError("מזהה הצעת מחיר חסר בכתובת ה-URL.");
          setLoading(false);
          return;
        }

        const fetchedQuotes = await Quote.filter({ id: quoteId });
        const fetchedQuote = fetchedQuotes[0];
        
        if (fetchedQuote) {
          setQuote(fetchedQuote);
        } else {
          setError("הצעת המחיר המבוקשת לא נמצאה.");
        }
      } catch (e) {
        console.error("Failed to fetch quote:", e);
        setError("אירעה שגיאה בטעינת הצעת המחיר.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-700">טוען את הצעת המחיר...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50" dir="rtl">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-xl text-red-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100" dir="rtl">
        <div className="p-4 bg-white shadow-md print:hidden flex justify-between items-center sticky top-0 z-10">
            <div>
                <h1 className="text-lg font-bold">הצעת מחיר: {quote?.projectName}</h1>
                <p className="text-sm text-gray-600">עבור: {quote?.clientName}</p>
            </div>
            <Button onClick={() => window.print()}>
                <Printer className="ml-2 h-4 w-4"/>
                הדפסה / שמירה כ-PDF
            </Button>
        </div>
        <main>
            {quote ? <QuoteToHTML quote={quote} /> : <p>לא נטענו נתונים.</p>}
        </main>
    </div>
  );
}