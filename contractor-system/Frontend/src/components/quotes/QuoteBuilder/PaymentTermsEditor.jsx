
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Trash2, PlusCircle, AlertCircle, Info, ChevronDown, ChevronUp, Settings, Sparkles } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PaymentTermsEditor({ terms, onUpdateTerms, projectStartDate, projectEndDate }) {
  const [localTerms, setLocalTerms] = useState(terms || []);
  const [isOpen, setIsOpen] = useState(false); // Default to closed

  useEffect(() => {
    setLocalTerms(terms || []);
  }, [terms]);

  const handleUpdate = (index, field, value) => {
    const updatedTerms = [...localTerms];
    updatedTerms[index][field] = value;
    setLocalTerms(updatedTerms);
    onUpdateTerms(updatedTerms);
  };

  const handleAddTerm = () => {
    const newTerm = {
        id: `term-${Date.now()}`,
        milestone: '',
        percentage: 0,
        paymentDate: null
    };
    const updatedTerms = [...localTerms, newTerm];
    setLocalTerms(updatedTerms);
    onUpdateTerms(updatedTerms);
  };

  const handleRemoveTerm = (index) => {
    const updatedTerms = localTerms.filter((_, i) => i !== index);
    setLocalTerms(updatedTerms);
    onUpdateTerms(updatedTerms);
  };

  // Calculate dynamic payment dates based on project timeline
  const calculateDynamicPaymentDates = () => {
    if (!projectStartDate || !projectEndDate || localTerms.length === 0) {
      return localTerms;
    }

    const startDate = new Date(projectStartDate);
    const endDate = new Date(projectEndDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    return localTerms.map((term, index) => {
      // Smart detection based on milestone description
      const milestone = (term.milestone || '').toLowerCase();

      let calculatedDate;

      // First payment - start date
      if (index === 0 || milestone.includes('מקדמה') || milestone.includes('ראשון') || milestone.includes('התחלה')) {
        calculatedDate = startDate;
      }
      // Last payment - end date
      else if (index === localTerms.length - 1 || milestone.includes('סופי') || milestone.includes('סיום') || milestone.includes('אחרון')) {
        calculatedDate = endDate;
      }
      // Middle payments - distributed evenly
      else {
        const interval = totalDays / (localTerms.length - 1);
        const daysToAdd = Math.round(interval * index);
        calculatedDate = addDays(startDate, daysToAdd);
      }

      return {
        ...term,
        paymentDate: calculatedDate
      };
    });
  };

  // Handler for auto-fill dates button
  const handleAutoFillDates = () => {
    const updatedTerms = calculateDynamicPaymentDates();
    setLocalTerms(updatedTerms);
    onUpdateTerms(updatedTerms);
  };

  const totalPercentage = localTerms.reduce((sum, term) => sum + (Number(term.percentage) || 0), 0);

  // Check if payment dates are in chronological order
  const checkDateOrder = () => {
    const datesWithIndices = localTerms
      .map((term, index) => ({ date: term.paymentDate, index }))
      .filter(item => item.date); // Only terms with dates

    if (datesWithIndices.length <= 1) return { isValid: true, conflicts: [] };

    const conflicts = [];
    for (let i = 0; i < datesWithIndices.length - 1; i++) {
      const currentDate = new Date(datesWithIndices[i].date);
      const nextDate = new Date(datesWithIndices[i + 1].date);
      
      // Changed from 'currentDate.getTime() >= nextDate.getTime()' to 'currentDate > nextDate' based on outline.
      // This means same dates are no longer flagged as conflicts here, but are disabled in calendar for subsequent entries.
      if (currentDate > nextDate) { 
        conflicts.push({
          current: datesWithIndices[i].index,
          next: datesWithIndices[i + 1].index
        });
      }
    }

    return { isValid: conflicts.length === 0, conflicts };
  };

  const dateOrderCheck = checkDateOrder();

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden w-full max-w-full">
      {/* Header - Always Visible */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer transition-colors border-b select-none gap-2 sm:gap-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">תנאי תשלום</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {isOpen ? 'לחץ כדי לסגור' : 'תנאי התשלום נטענו מהמחירון - לחץ לעריכה ידנית'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {!isOpen && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-green-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium text-green-700">
                {localTerms.length} שלבים ({totalPercentage}%)
              </span>
            </div>
          )}
          {/* Warning indicator for date conflicts */}
          {!dateOrderCheck.isValid && !isOpen && (
            <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">תאריכים לא בסדר</span>
            </div>
          )}
          <div className="text-gray-500">
            {isOpen ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Date Order Warning */}
          {!dateOrderCheck.isValid && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="font-semibold text-amber-800">תאריכי התשלום לא בסדר כרונולוגי</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                יש תאריכי תשלום שמתרחשים לפני תשלומים קודמים ברשימה. מומלץ לסדר אותם לפי סדר כרונולוגי עולה.
              </AlertDescription>
            </Alert>
          )}

          {localTerms.map((term, index) => {
            // Check if this specific term has date conflicts based on the checkDateOrder logic
            const hasConflict = dateOrderCheck.conflicts.some(conflict => 
              conflict.current === index || conflict.next === index
            );

            // Get the payment date of the previous term to disable earlier dates in the calendar
            const previousTermDate = index > 0 ? localTerms[index - 1].paymentDate : null;

            return (
              <div key={term.id || index} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-x-3 items-stretch sm:items-center p-2 sm:p-3 rounded-md bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <div className="sm:col-span-5">
                  <Label htmlFor={`milestone-${index}`} className="text-xs sm:sr-only mb-1 block sm:hidden">אבן דרך</Label>
                  <Input
                    id={`milestone-${index}`}
                    placeholder="תיאור אבן הדרך"
                    value={term.milestone}
                    onChange={(e) => handleUpdate(index, 'milestone', e.target.value)}
                    className="text-xs sm:text-sm bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`percentage-${index}`} className="text-xs sm:sr-only mb-1 block sm:hidden">אחוז</Label>
                  <div className="relative">
                    <Input
                      id={`percentage-${index}`}
                      type="number"
                      placeholder="%"
                      value={term.percentage}
                      onChange={(e) => handleUpdate(index, 'percentage', e.target.value)}
                      className="text-xs sm:text-sm text-center bg-white"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm">%</span>
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs sm:sr-only mb-1 block sm:hidden">תאריך תשלום</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className={cn(
                                  "w-full justify-start text-right font-normal text-xs sm:text-sm transition-colors duration-200 bg-white",
                                  !term.paymentDate
                                      ? "border-red-200 text-red-700 hover:bg-red-50"
                                      : hasConflict
                                      ? "border-amber-300 text-amber-800 hover:bg-amber-50"
                                      : "border-green-300 text-green-800 hover:bg-green-50"
                              )}
                          >
                              <CalendarIcon className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                              {hasConflict && <AlertCircle className="ml-1 h-3 w-3 text-amber-600" />}
                              {term.paymentDate ? format(new Date(term.paymentDate), "d MMMM, yyyy", { locale: he }) : <span>בחר תאריך</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={term.paymentDate ? new Date(term.paymentDate) : null}
                              onSelect={(date) => handleUpdate(index, 'paymentDate', date)}
                              initialFocus
                              dir="rtl"
                              // Disable dates before the previous term's payment date.
                              // This ensures chronological order is enforced during date selection.
                              disabled={previousTermDate ? { before: new Date(previousTermDate) } : undefined}
                          />
                      </PopoverContent>
                  </Popover>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveTerm(index)} className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-100">
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-3 border-t gap-2 sm:gap-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleAddTerm} className="text-xs sm:text-sm w-full sm:w-auto">
                <PlusCircle className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                הוסף שלב תשלום
              </Button>
              <Button
                variant="outline"
                onClick={handleAutoFillDates}
                disabled={!projectStartDate || !projectEndDate || localTerms.length === 0}
                className="text-xs sm:text-sm w-full sm:w-auto border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!projectStartDate || !projectEndDate ? "נא למלא תאריכי פרויקט" : "מלא תאריכים אוטומטית לפי לוח זמנים"}
              >
                <Sparkles className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                מלא תאריכים אוטומטית
              </Button>
            </div>
            <div className={cn("text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-end gap-1 sm:gap-2", totalPercentage === 100 ? "text-green-600" : "text-red-600")}>
                {totalPercentage !== 100 && <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
                <span>סה"כ: {totalPercentage}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
