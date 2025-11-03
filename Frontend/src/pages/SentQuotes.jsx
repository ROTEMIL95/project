
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Quote } from '@/lib/entities';
import { FinancialTransaction } from '@/lib/entities';
import { useUser } from '@/components/utils/UserContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  AlertCircle,
  Filter,
  User2 as UserIcon,
  DollarSign,
  TrendingUp,
  PieChart,
  ArrowUpDown,
  XCircle,
  Plus,
  Building,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import ConfettiBurst from '@/components/effects/ConfettiBurst';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast"

export default function SentQuotes() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteAlert, setDeleteAlert] = useState({ isOpen: false, quote: null });
    const [statusFilter, setStatusFilter] = useState('הכל');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
    const { user } = useUser();
    const [confettiTriggerId, setConfettiTriggerId] = useState(null);
    const [hoveredLegendItem, setHoveredLegendItem] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // פילטרים מתקדמים
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [dateFilter, setDateFilter] = useState({
        type: 'all', // 'all', 'month2', 'month3', 'month6', 'year1', 'custom'
        from: null,
        to: null
    });
    const [amountRangeFilter, setAmountRangeFilter] = useState('all');
    const [profitFilter, setProfitFilter] = useState('all'); // 'all', 'low', 'medium', 'high'
    const [projectTypeFilter, setProjectTypeFilter] = useState('all');

    // Colors for charts
    const chartColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const statusFromUrl = urlParams.get('status');
                if (statusFromUrl) {
                    setStatusFilter(decodeURIComponent(statusFromUrl));
                }

                if (!user || !user.email) {
                    throw new Error("User not authenticated or user email not found.");
                }
                await loadQuotes(user);
            } catch (err) {
                console.error("Initial data fetch error:", err);
                setError("נדרשת התחברות כדי לצפות בדף זה.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [user]);

    const loadQuotes = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!user) throw new Error("User context is missing.");

            const fetchedQuotes = await Quote.filter({ user_id: user.id });
            setQuotes(fetchedQuotes);
        } catch (err) {
            console.error("Error loading quotes:", err);
            setError("אירעה שגיאה בטעינת הצעות המחיר. נסה לרענן את העמוד.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        if(user) {
            loadQuotes();
        }
    };

    const handleDeleteQuote = async (quoteToDelete) => {
        if (!quoteToDelete || !user) return;

        // Allow admins to delete any quote, or users to delete their own quotes
        const isAdmin = user?.role === 'admin';
        const isOwner = quoteToDelete.created_by === user.email || quoteToDelete.userId === user.id;
        
        if (!isAdmin && !isOwner) {
            toast({
                variant: "destructive",
                title: "שגיאת הרשאות",
                description: "אינך רשאי למחוק הצעת מחיר זו.",
            });
            setDeleteAlert({ isOpen: false, quote: null });
            return;
        }

        try {
            // First, try to delete the main quote entity.
            try {
                await Quote.delete(quoteToDelete.id);
            } catch (error) {
                // Check if it's a "not found" error - can be in message or status code
                const is404 = error.response?.status === 404 || 
                              error.message?.toLowerCase().includes('not found') ||
                              error.message?.includes('404');
                
                if (!is404) {
                    console.error("Backend error deleting quote:", error);
                } else {
                    console.log("Quote was already deleted, proceeding with cleanup.");
                }
            }

            // Second, try to remove the associated financial transaction.
            await removeFinancialTransaction(quoteToDelete.id);

        } catch (e) {
            console.error("An unexpected error occurred during the deletion process:", e);
        } finally {
            // This block will ALWAYS run, ensuring the UI is updated and the dialog closes.
            setQuotes(prevQuotes => prevQuotes.filter(q => q.id !== quoteToDelete.id));
            toast({
                title: "ההצעה הוסרה",
                description: `הצעת המחיר "${quoteToDelete.projectName}" הוסרה מהרשימה.`,
            });
            setDeleteAlert({ isOpen: false, quote: null });
        }
    };

    const handleEditQuote = (quote) => {
        // Allow admins to edit any quote, or users to edit their own quotes
        const isAdmin = user?.role === 'admin';
        const isOwner = user && (quote.created_by === user.email || quote.userId === user.id);
        
        if (user && !isAdmin && !isOwner) {
            toast({
                variant: "destructive",
                title: "שגיאת הרשאות",
                description: "אינך רשאי לערוך הצעת מחיר זו.",
            });
            return;
        }
        navigate(createPageUrl(`QuoteCreate?id=${quote.id}`));
    };

    const handleStatusChange = async (quote, newStatus) => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "שגיאה",
                description: "משתמש לא מזוהה.",
            });
            return;
        }

        const oldStatus = quote.status;
        
        try {
            // עדכון סטטוס ההצעה
            await Quote.update(quote.id, { status: newStatus });
            
            // טיפול בטרנזקציות פיננסיות בהתאם לשינוי הסטטוס
            await handleFinancialTransactionSync(quote, oldStatus, newStatus);
            
            // רענון הנתונים
            await loadQuotes();
            
            // הודעה למשתמש וטריגר קונפטי
            if (newStatus === 'אושר' && oldStatus !== 'אושר') {
                setConfettiTriggerId(quote.id); // Trigger confetti
                toast({
                    variant: "success",
                    title: "ההצעה אושרה!",
                    description: `הנתונים עבור "${quote.projectName}" סונכרנו עם הניהול הפיננסי.`,
                });
            } else if (oldStatus === 'אושר' && newStatus !== 'אושר') {
                toast({
                    title: "הסטטוס עודכן",
                    description: `הנתונים עבור "${quote.projectName}" הוסרו מהניהול הפיננסי.`,
                });
            } else {
                 toast({
                    title: "סטטוס עודכן בהצלחה",
                    description: `הסטטוס של "${quote.projectName}" שונה ל: ${newStatus}`,
                });
            }
            
        } catch (error) {
            console.error('Error updating quote status:', error);
            toast({
                variant: "destructive",
                title: "שגיאה בעדכון",
                description: "אירעה שגיאה בעדכון הסטטוס. נסה שוב.",
            });
        }
    };

    // פונקציה חדשה לטיפול בסנכרון הטרנזקציות הפיננסיות
    const handleFinancialTransactionSync = async (quote, oldStatus, newStatus) => {
        // אם הצעה עוברת לסטטוס "אושר" ולפני זה לא הייתה מאושרת
        if (newStatus === 'אושר' && oldStatus !== 'אושר') {
            await createFinancialTransaction(quote);
        }
        // אם הצעה הייתה מאושרת ועוברת לסטטוס אחר
        else if (oldStatus === 'אושר' && newStatus !== 'אושר') {
            await removeFinancialTransaction(quote.id);
        }
        // אם זה שינוי בין סטטוסים שאינם "אושר" - לא צריך לעשות כלום
    };

    // פונקציה ליצירת טרנזקציה פיננסית
    const createFinancialTransaction = async (quote) => {
        try {
            // בדיקה אם כבר קיימת טרנזקציה עבור ההצעה הזו
            const existingTransactions = await FinancialTransaction.filter({ quoteId: quote.id });
            
            if (existingTransactions.length > 0) {
                console.log(`טרנזקציה פיננסית כבר קיימת עבור הצעה ${quote.id}. מדלג על יצירה.`);
                return;
            }

            // חישוב עלויות משוערות מההצעה
            let totalEstimatedCost = 0;
            
            if (quote.items && Array.isArray(quote.items)) {
                for (const item of quote.items) {
                    totalEstimatedCost += (item.materialCost || 0);
                    totalEstimatedCost += (item.laborCost || 0);
                    totalEstimatedCost += (item.additionalCost || 0);
                    totalEstimatedCost += (item.fixedCostsTotal || 0); // Include fixed costs from item
                }
            }
            
            // הוספת עלויות פרויקט משתנות
            if (quote.projectComplexities && 
                quote.projectComplexities.additionalCostDetails && 
                Array.isArray(quote.projectComplexities.additionalCostDetails)) {
                for (const detail of quote.projectComplexities.additionalCostDetails) {
                    totalEstimatedCost += (detail.contractorCost || detail.cost || 0);
                }
            }

            // יצירת טרנזקציה פיננסית חדשה
            const transactionData = {
                quoteId: quote.id,
                transactionDate: new Date().toISOString(),
                revenue: quote.finalAmount || quote.totalAmount || 0, // Use finalAmount if available, otherwise totalAmount
                estimatedCost: totalEstimatedCost,
                estimatedProfit: (quote.finalAmount || quote.totalAmount || 0) - totalEstimatedCost,
                status: 'completed',
                projectType: quote.projectType || 'אחר'
            };

            await FinancialTransaction.create(transactionData);
            console.log(`נוצרה טרנזקציה פיננסית עבור הצעה ${quote.id}`);
            
        } catch (error) {
            console.error('Error creating financial transaction:', error);
            throw error; // Re-throw to be caught by the caller
        }
    };

    // פונקציה להסרת טרנזקציה פיננסית - עם שיפורי טיפול בשגיאות
    const removeFinancialTransaction = async (quoteId) => {
        try {
            const existingTransactions = await FinancialTransaction.filter({ quoteId: quoteId });
            
            for (const transaction of existingTransactions) {
                try {
                    await FinancialTransaction.delete(transaction.id);
                    console.log(`נמחקה טרנזקציה פיננסית ${transaction.id} עבור הצעה ${quoteId}`);
                } catch (deleteError) {
                     // Check if it's a "not found" error
                    const is404 = deleteError.response?.status === 404 ||
                                  deleteError.message?.toLowerCase().includes('not found') ||
                                  deleteError.message?.includes('404');
                    
                    if (is404) {
                        console.log(`Transaction ${transaction.id} already deleted, skipping.`);
                    } else {
                        console.error(`Unexpected error deleting transaction ${transaction.id}:`, deleteError);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching transactions to remove:', error);
            // We don't re-throw the error, as failing to remove a transaction
            // shouldn't prevent the quote from being removed from the UI.
        }
    };

    const getDateRange = (type) => {
        const now = new Date();
        let from = null;
        let to = now;

        switch (type) {
            case 'month2':
                from = subMonths(now, 2);
                break;
            case 'month3':
                from = subMonths(now, 3);
                break;
            case 'month6':
                from = subMonths(now, 6);
                break;
            case 'year1':
                from = subYears(now, 1);
                break;
            case 'all':
            default:
                from = null;
                to = null;
                break;
        }
        return { from, to };
    };

    const getAmountRanges = useMemo(() => {
        if (quotes.length === 0) return [];

        const amounts = quotes
            .map(quote => quote.finalAmount || 0)
            .filter(amount => amount > 0)
            .sort((a, b) => a - b);

        if (amounts.length === 0) return [];

        const min = amounts[0];
        const max = amounts[amounts.length - 1];

        if (min === max) {
            return [{
                id: 'range1',
                label: `₪${min.toLocaleString()}`,
                min: min,
                max: max,
                color: 'bg-blue-100 text-blue-800'
            }];
        }

        const rangeSize = (max - min) / 5;
        const formatLabelNum = (num) => Math.round(num).toLocaleString();

        return [
            {
                id: 'range1',
                label: `₪${formatLabelNum(min)} - ₪${formatLabelNum(min + rangeSize)}`,
                min: min,
                max: min + rangeSize,
                color: 'bg-blue-100 text-blue-800'
            },
            {
                id: 'range2',
                label: `₪${formatLabelNum(min + rangeSize)} - ₪${formatLabelNum(min + rangeSize * 2)}`,
                min: min + rangeSize,
                max: min + rangeSize * 2,
                color: 'bg-green-100 text-green-800'
            },
            {
                id: 'range3',
                label: `₪${formatLabelNum(min + rangeSize * 2)} - ₪${formatLabelNum(min + rangeSize * 3)}`,
                min: min + rangeSize * 2,
                max: min + rangeSize * 3,
                color: 'bg-yellow-100 text-yellow-800'
            },
            {
                id: 'range4',
                label: `₪${formatLabelNum(min + rangeSize * 3)} - ₪${formatLabelNum(min + rangeSize * 4)}`,
                min: min + rangeSize * 3,
                max: min + rangeSize * 4,
                color: 'bg-orange-100 text-orange-800'
            },
            {
                id: 'range5',
                label: `₪${formatLabelNum(min + rangeSize * 4)} - ₪${formatLabelNum(max)}`,
                min: min + rangeSize * 4,
                max: max,
                color: 'bg-red-100 text-red-800'
            }
        ];
    }, [quotes]);

    const filteredQuotes = useMemo(() => {
        return quotes.filter(quote => {
            const matchesSearch = quote.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  quote.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'הכל' ||
                                  (quote.status || 'טיוטה') === statusFilter;

            let matchesDate = true;
            if (dateFilter.type !== 'all') {
                const quoteDate = new Date(quote.createdAt);
                let currentFromDate, currentToDate;

                if (dateFilter.type === 'custom') {
                    currentFromDate = dateFilter.from ? startOfDay(new Date(dateFilter.from)) : null;
                    currentToDate = dateFilter.to ? endOfDay(new Date(dateFilter.to)) : null;
                } else {
                    const range = getDateRange(dateFilter.type);
                    currentFromDate = range.from ? startOfDay(range.from) : null;
                    currentToDate = range.to ? endOfDay(range.to) : null;
                }

                matchesDate = (!currentFromDate || quoteDate >= currentFromDate) && (!currentToDate || quoteDate <= currentToDate);
            }

            let matchesAmountRange = true;
            if (amountRangeFilter !== 'all') {
                const selectedRange = getAmountRanges.find(range => range.id === amountRangeFilter);
                if (selectedRange) {
                    const finalAmount = quote.finalAmount || 0;
                    matchesAmountRange = finalAmount >= selectedRange.min && finalAmount <= selectedRange.max;
                }
            }

            let matchesProfit = true;
            if (profitFilter !== 'all') {
                const currentQuoteTotalCost = quote.estimatedCost || 0;
                const currentQuoteTotalProfit = (quote.finalAmount || 0) - currentQuoteTotalCost;
                const currentQuoteProfitPercent = currentQuoteTotalCost > 0 ? (currentQuoteTotalProfit / currentQuoteTotalCost) * 100 : 0;

                switch (profitFilter) {
                    case 'low':
                        matchesProfit = currentQuoteProfitPercent < 20;
                        break;
                    case 'medium':
                        matchesProfit = currentQuoteProfitPercent >= 20 && currentQuoteProfitPercent <= 40;
                        break;
                    case 'high':
                        matchesProfit = currentQuoteProfitPercent > 40;
                        break;
                    default:
                        matchesProfit = true;
                }
            }

            const matchesProjectType = projectTypeFilter === 'all' || quote.projectType === projectTypeFilter;

            return matchesSearch && matchesStatus && matchesDate && matchesAmountRange && matchesProfit && matchesProjectType;
        });
    }, [quotes, searchQuery, statusFilter, dateFilter, amountRangeFilter, profitFilter, projectTypeFilter, getAmountRanges]);

    const sortedQuotes = useMemo(() => {
        let sortableItems = [...filteredQuotes];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === 'finalAmount') {
                    aValue = a.finalAmount || 0;
                    bValue = b.finalAmount || 0;
                } else if (sortConfig.key === 'estimatedCost') {
                    aValue = a.estimatedCost || 0;
                    bValue = b.estimatedCost || 0;
                } else if (sortConfig.key === 'profit') {
                    // Simplified profit calculation
                    const aProfit = (a.finalAmount || 0) - (a.estimatedCost || 0);
                    const bProfit = (b.finalAmount || 0) - (b.estimatedCost || 0);
                    aValue = aProfit;
                    bValue = bProfit;
                } else if (sortConfig.key === 'profitPercent') {
                    // Simplified profit percent calculation
                    const aCost = a.estimatedCost || 0;
                    const aProfit = (a.finalAmount || 0) - aCost;
                    aValue = aCost > 0 ? (aProfit / aCost) * 100 : 0;

                    const bCost = b.estimatedCost || 0;
                    const bProfit = (b.finalAmount || 0) - bCost;
                    bValue = bCost > 0 ? (bProfit / bCost) * 100 : 0;
                } else if (sortConfig.key === 'createdAt') {
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                } else {
                    aValue = a[sortConfig.key] || '';
                    bValue = b[sortConfig.key] || '';
                    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredQuotes, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
        return sortConfig.direction === 'ascending'
            ? <ArrowUpDown className="h-3 w-3 text-indigo-600" />
            : <ArrowUpDown className="h-3 w-3 text-indigo-600" />;
    };

    const handleDownload = (quoteId) => {
      window.open(createPageUrl(`ClientQuoteView?id=${quoteId}`), '_blank');
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('הכל');
        setDateFilter({ type: 'all', from: null, to: null });
        setAmountRangeFilter('all');
        setProfitFilter('all');
        setProjectTypeFilter('all');
    };

    const formatCurrency = (value) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    const prepareRevenueByClientData = () => {
        const clientRevenue = {};
        sortedQuotes.forEach(quote => {
            if (quote.status !== 'אושר') return;
            const client = quote.clientName || 'לקוח לא ידוע';
            const revenue = quote.finalAmount || 0;
            clientRevenue[client] = (clientRevenue[client] || 0) + revenue;
        });

        return Object.entries(clientRevenue)
            .filter(([_, value]) => value > 0)
            .map(([name, value], index) => ({
                name,
                value,
                color: chartColors[index % chartColors.length]
            }))
            .sort((a, b) => b.value - a.value);
    };

    const prepareCostByClientData = () => {
        const clientCost = {};
        sortedQuotes.forEach(quote => {
            if (quote.status !== 'אושר') return;
            const client = quote.clientName || 'לקוח לא ידוע';
            // Simplified cost calculation: only estimatedCost
            const totalCost = quote.estimatedCost || 0;
            clientCost[client] = (clientCost[client] || 0) + totalCost;
        });

        return Object.entries(clientCost)
            .filter(([_, value]) => value > 0)
            .map(([name, value], index) => ({
                name,
                value,
                color: chartColors[index % chartColors.length]
            }))
            .sort((a, b) => b.value - a.value);
    };

    const prepareProfitByClientData = () => {
        const clientProfit = {};
        sortedQuotes.forEach(quote => {
            if (quote.status !== 'אושר') return;
            const client = quote.clientName || 'לקוח לא ידוע';
            // Simplified profit calculation: finalAmount - estimatedCost
            const totalProfit = (quote.finalAmount || 0) - (quote.estimatedCost || 0);

            clientProfit[client] = (clientProfit[client] || 0) + totalProfit;
        });

        return Object.entries(clientProfit)
            .filter(([_, value]) => value > 0)
            .map(([name, value], index) => ({
                name,
                value,
                color: chartColors[index % chartColors.length]
            }))
            .sort((a, b) => b.value - a.value);
    };

    const prepareProfitByStatusData = () => {
        const statusProfit = {};
        sortedQuotes.forEach(quote => {
            const status = quote.status || 'טיוטה';
            // Simplified profit calculation: finalAmount - estimatedCost
            const totalProfit = (quote.finalAmount || 0) - (quote.estimatedCost || 0);

            statusProfit[status] = (statusProfit[status] || 0) + totalProfit;
        });

        const statusColors = {
            'אושר': '#10b981',
            'נשלח': '#3b82f6',
            'טיוטה': '#6b7280',
            'נדחה': '#ef4444',
            'בוטל': '#f59e0b'
        };

        return Object.entries(statusProfit)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name,
                value,
                color: statusColors[name] || '#6b7280'
            }))
            .sort((a, b) => b.value - a.value);
    };

    const prepareStatusData = () => {
        const statusCount = {};
        sortedQuotes.forEach(quote => {
            const status = quote.status || 'טיוטה';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        const statusColors = { 'אושר': '#10b981', 'נשלח': '#3b82f6', 'טיוטה': '#6b7280', 'נדחה': '#ef4444', 'בוטל': '#f59e0b' };

        return Object.entries(statusCount)
            .map(([name, value]) => ({
                name,
                value,
                color: statusColors[name] || '#6b7280'
            }))
            .sort((a, b) => b.value - a.value);
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-right">
                    <p className="font-semibold text-gray-800">{data.name}</p>
                    <p className="text-indigo-600">{data.payload.chartType === 'status' ? `${data.value} הצעות` : formatCurrency(data.value)}</p>
                </div>
            );
        }
        return null;
    };

    const handleLegendClick = (data, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
        setHoveredLegendItem(data);
    };

    const handleLegendLeave = () => setHoveredLegendItem(null);

    const CustomLegend = ({ payload }) => (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
            {payload.map((entry, index) => {
                const { name, percentage } = entry.payload;
                return (
                    <div key={`legend-${index}`} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors" onClick={(e) => handleLegendClick(entry.payload, e)} onMouseLeave={handleLegendLeave}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm text-gray-700">{name}</span>
                        <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                    </div>
                );
            })}
        </div>
    );

    const PieChartComponent = ({ data, title, description, chartType }) => {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const dataWithPercentages = data.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0, chartType: chartType }));

        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-gray-800"><PieChart className="h-5 w-5 text-indigo-600" />{title}</CardTitle>
                            <CardDescription className="text-gray-600">{description}</CardDescription>
                        </div>
                        <div className="text-left">
                            <div className="text-2xl font-bold text-gray-800">{chartType === 'status' ? `${total} הצעות` : formatCurrency(total)}</div>
                            <div className="text-sm text-gray-500">סה״כ</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pb-2">
                    {data.length > 0 ? (
                        <div className="h-[350px] relative pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie data={dataWithPercentages} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" labelLine={false} label={false}>
                                        {dataWithPercentages.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend content={<CustomLegend />} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ position: 'relative', marginTop: '10px' }} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[350px] flex items-center justify-center text-gray-500 pt-4">
                            <div className="text-center"><PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>אין נתונים להצגה</p></div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {hoveredLegendItem && (
                <div className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none" style={{ left: tooltipPosition.x, top: tooltipPosition.y, transform: 'translate(-50%, -100%)' }}>
                    <div className="text-sm font-semibold">{hoveredLegendItem.name}</div>
                    <div className="text-xs">{hoveredLegendItem.chartType === 'status' ? `${hoveredLegendItem.value} הצעות` : formatCurrency(hoveredLegendItem.value)}</div>
                    <div className="text-xs opacity-75">{`${hoveredLegendItem.percentage?.toFixed(1)}% מהסך הכולל`}</div>
                </div>
            )}

            <div className="container mx-auto p-6 max-w-7xl">
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">הצעות מחיר שנשלחו</h1>
                            <p className="text-gray-600">מעקב ומעקב אחר כל הצעות המחיר שיצרת</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleRefresh} disabled={loading} className="bg-white hover:bg-gray-50 border-gray-200">
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>} רענן
                            </Button>
                            <Button onClick={() => navigate(createPageUrl('QuoteCreate'))} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg">
                                <FileText className="h-4 w-4 ml-2" /> צור הצעה חדשה
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 shadow-sm" role="alert">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 mr-3" />
                            <div>
                                <strong className="font-semibold">שגיאה: </strong>
                                <span>{error}</span>
                            </div>
                        </div>
                    </div>
                )}

                <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl text-gray-800">סינון וחיפוש</CardTitle>
                                <CardDescription className="text-gray-600 mt-1">מצא הצעות לפי פרמטרים שונים</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="flex items-center gap-2"
                            >
                                <Filter className="h-4 w-4" />
                                סינון מתקדם
                                {showAdvancedFilters ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative lg:col-span-2">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-3 pr-10 bg-white"
                                    placeholder="חיפוש לפי שם לקוח או פרויקט..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between bg-white">
                                        <span>סטטוס: {statusFilter}</span>
                                        <Filter className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white w-[--radix-dropdown-menu-trigger-width]">
                                    <DropdownMenuItem onClick={() => setStatusFilter('הכל')}>הכל</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('אושר')}>אושר</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('נדחה')}>נדחה</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('בוטל')}>בוטל</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('נשלח')}>נשלח</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('טיוטה')}>טיוטה</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" onClick={clearFilters} className="text-gray-600 hover:text-red-600">
                                <XCircle className="h-4 w-4 ml-2"/>
                                נקה סינונים
                            </Button>
                        </div>

                        {showAdvancedFilters && (
                            <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                                {/* שורה ראשונה - כל הפילטרים הבסיסיים */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">תקופת זמן</Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between bg-white">
                                                    <span>
                                                        {dateFilter.type === 'all' && 'כל התקופות'}
                                                        {dateFilter.type === 'month2' && 'חודשיים אחרונים'}
                                                        {dateFilter.type === 'month3' && '3 חודשים אחרונים'}
                                                        {dateFilter.type === 'month6' && '6 חודשים אחרונים'}
                                                        {dateFilter.type === 'year1' && 'שנה אחרונה'}
                                                        {dateFilter.type === 'custom' && 'תאריך ידני'}
                                                    </span>
                                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white">
                                                <DropdownMenuItem onClick={() => setDateFilter({ type: 'all', from: null, to: null })}>כל התקופות</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDateFilter({ type: 'month2', from: null, to: null })}>חודשיים אחרונים</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDateFilter({ type: 'month3', from: null, to: null })}>3 חודשים אחרונים</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDateFilter({ type: 'month6', from: null, to: null })}>6 חודשים אחרונים</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDateFilter({ type: 'year1', from: null, to: null })}>שנה אחרונה</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDateFilter({ type: 'custom', from: null, to: null })}>תאריך ידני</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">אחוז רווח</Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between bg-white">
                                                     <span>
                                                         {profitFilter === 'all' && 'כל הרווחים'}
                                                         {profitFilter === 'low' && 'מתחת ל-20%'}
                                                         {profitFilter === 'medium' && 'בין 20%-40%'}
                                                         {profitFilter === 'high' && 'מעל 40%'}
                                                     </span>
                                                     <TrendingUp className="h-4 w-4 opacity-50" />
                                                 </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white">
                                                <DropdownMenuItem onClick={() => setProfitFilter('all')}>כל הרווחים</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProfitFilter('low')}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-100"></div>מתחת ל-20%</div></DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProfitFilter('medium')}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-100"></div>בין 20%-40%</div></DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProfitFilter('high')}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-100"></div>מעל 40%</div></DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">סוג פרויקט</Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between bg-white">
                                                     <span>{projectTypeFilter === 'all' ? 'כל הסוגים' : projectTypeFilter}</span>
                                                     <Building className="h-4 w-4 opacity-50" />
                                                 </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white">
                                                <DropdownMenuItem onClick={() => setProjectTypeFilter('all')}>כל הסוגים</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProjectTypeFilter('דירה')}>דירה</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProjectTypeFilter('משרד')}>משרד</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProjectTypeFilter('וילה')}>וילה</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProjectTypeFilter('אחר')}>אחר</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* שורה שנייה - תאריכים מותאמים (רק אם נבחר) */}
                                {dateFilter.type === 'custom' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">מתאריך</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start font-normal bg-white">
                                                        {dateFilter.from ? format(dateFilter.from, "d בLLL, y", { locale: he }) : <span>בחר תאריך</span>}
                                                        <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={dateFilter.from} onSelect={(date) => setDateFilter(prev => ({ ...prev, from: date, type: 'custom' }))} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">עד תאריך</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start font-normal bg-white">
                                                        {dateFilter.to ? format(dateFilter.to, "d בLLL, y", { locale: he }) : <span>בחר תאריך</span>}
                                                        <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={dateFilter.to} onSelect={(date) => setDateFilter(prev => ({ ...prev, to: date, type: 'custom' }))} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                )}
                                
                                {/* שורה שלישית - טווח עסקאות */}
                                {getAmountRanges.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">טווח עסקאות (לפי סכום סופי)</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <Button
                                                variant={amountRangeFilter === 'all' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setAmountRangeFilter('all')}
                                                className="justify-start text-xs"
                                            >
                                                כל הטווחים
                                            </Button>
                                            {getAmountRanges.map((range) => (
                                                <Button
                                                    key={range.id}
                                                    variant={amountRangeFilter === range.id ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setAmountRangeFilter(range.id)}
                                                    className="justify-start text-xs"
                                                >
                                                    <div className={cn("w-3 h-3 rounded-full ml-2", range.color)}></div>
                                                    {range.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {loading ? ( <div className="flex h-96 items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div><p className="mt-4 text-gray-600 text-lg">טוען נתונים...</p></div></div>
                ) : sortedQuotes.length === 0 ? (
                    <div className="text-center py-16"><div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto"><FileText className="h-16 w-16 mx-auto text-gray-300 mb-6" /><h3 className="text-2xl font-semibold text-gray-900 mb-4">אין הצעות מחיר</h3><p className="text-gray-600 mb-8 leading-relaxed">לא נמצאו הצעות מחיר התואמות לסינון. נסה לשנות את תנאי החיפוש.</p><Button onClick={() => navigate(createPageUrl('QuoteCreate'))} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3"><FileText className="h-5 w-5 ml-2" /> צור הצעת מחיר ראשונה</Button></div></div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('projectName')}>פרויקט / לקוח{getSortIndicator('projectName')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('createdAt')}>תאריך{getSortIndicator('createdAt')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('status')}>סטטוס{getSortIndicator('status')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('finalAmount')}>סכום{getSortIndicator('finalAmount')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('estimatedCost')}>עלות{getSortIndicator('estimatedCost')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('profit')}>רווח{getSortIndicator('profit')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"><Button variant="ghost" className="p-0 h-auto hover:bg-transparent" onClick={() => requestSort('profitPercent')}>רווח %{getSortIndicator('profitPercent')}</Button></th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                {sortedQuotes.map((quote) => {
                                    // Simplified and direct calculation from saved quote data
                                    const totalCost = quote.estimatedCost || 0;
                                    const totalProfit = (quote.finalAmount || 0) - totalCost;
                                    const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

                                    // קביעת צבע רקע לפי סטטוס
                                    const getRowBackgroundClass = (status) => {
                                        switch(status || 'טיוטה') {
                                            case 'אושר':
                                                return 'bg-green-50/50 hover:bg-green-100';
                                            case 'נדחה':
                                                return 'bg-red-50/50 hover:bg-red-100';
                                            case 'בוטל':
                                                return 'bg-yellow-50/50 hover:bg-yellow-100';
                                            case 'נשלח':
                                                return 'bg-blue-50/50 hover:bg-blue-100';
                                            case 'טיוטה':
                                            default:
                                                return 'bg-gray-50/50 hover:bg-gray-100';
                                        }
                                    };

                                    return (
                                        <tr key={quote.id} className={`transition-colors ${getRowBackgroundClass(quote.status)}`}>
                                            <td className="px-3 py-3 text-sm">
                                                <div className="font-semibold text-gray-900 truncate max-w-48">{quote.projectName}</div>
                                                <div className="text-gray-500 text-xs truncate max-w-48">{quote.clientName}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center text-xs text-gray-600">
                                                {quote.createdAt ? format(new Date(quote.createdAt), 'dd/MM/yy', { locale: he }) : '-'}
                                            </td>
                                            <td className="px-3 py-3 text-center relative">
                                                {confettiTriggerId === quote.id && <ConfettiBurst onComplete={() => setConfettiTriggerId(null)} />}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                                            <Badge className={cn("px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer",
                                                                (quote.status || 'טיוטה') === 'אושר' && 'bg-green-100 text-green-800 hover:bg-green-200',
                                                                (quote.status || 'טיוטה') === 'נדחה' && 'bg-red-100 text-red-800 hover:bg-red-200',
                                                                (quote.status || 'טיוטה') === 'בוטל' && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
                                                                (quote.status || 'טיוטה') === 'נשלח' && 'bg-blue-100 text-blue-800 hover:bg-blue-200',
                                                                (quote.status || 'טיוטה') === 'טיוטה' && 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                            )}>
                                                                {quote.status || 'טיוטה'}
                                                            </Badge>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="center">
                                                        <DropdownMenuLabel>שנה סטטוס</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'אושר')} className="text-green-700 hover:bg-green-50">אושר</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'נדחה')} className="text-red-700 hover:bg-red-50">נדחה</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'בוטל')} className="text-yellow-700 hover:bg-yellow-50">בוטל</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'נשלח')} className="text-blue-700 hover:bg-blue-50">נשלח</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'טיוטה')} className="text-gray-700 hover:bg-gray-50">טיוטה</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-bold text-indigo-600">
                                                {formatCurrency(quote.finalAmount || 0)}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-700">
                                                {formatCurrency(totalCost)}
                                            </td>
                                            <td className={`px-3 py-3 text-center text-sm font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(totalProfit)}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <Badge className={cn("text-xs font-bold px-2 py-1 rounded-full",
                                                    profitPercent < 20 && 'bg-red-100 text-red-800',
                                                    profitPercent >= 20 && profitPercent < 30 && 'bg-yellow-100 text-yellow-800',
                                                    profitPercent >= 30 && profitPercent < 50 && 'bg-blue-100 text-blue-800',
                                                    profitPercent >= 50 && 'bg-green-100 text-green-800'
                                                )}>
                                                    {typeof profitPercent === 'number' ? profitPercent.toFixed(1) : '0'}%
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex justify-center gap-1">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl(`QuoteView?id=${quote.id}`))} className="h-7 w-7 p-0 hover:bg-blue-100">
                                                                    <Eye className="h-3 w-3 text-blue-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>צפייה</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="sm" onClick={() => handleEditQuote(quote)} className="h-7 w-7 p-0 hover:bg-indigo-100">
                                                                    <Edit className="h-3 w-3 text-indigo-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>עריכה</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="sm" onClick={() => handleDownload(quote.id)} className="h-7 w-7 p-0 hover:bg-green-100">
                                                                    <Download className="h-3 w-3 text-green-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>הורדה</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-100" onClick={() => setDeleteAlert({ isOpen: true, quote: quote })}>
                                                                    <Trash2 className="h-3 w-3 text-red-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>מחיקה</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                                <tfoot className="bg-gray-800 text-white border-t-2 border-gray-600">
                                    <tr>
                                        <td colSpan="3" className="px-3 py-4 text-sm font-bold text-right">סיכום ({sortedQuotes.length} הצעות)</td>
                                        <td className="px-3 py-4 text-center text-sm font-bold text-blue-200">{formatCurrency(sortedQuotes.reduce((sum, quote) => sum + (quote.finalAmount || 0), 0))}</td>
                                        <td className="px-3 py-4 text-center text-sm font-bold text-orange-200">
                                            {formatCurrency(sortedQuotes.reduce((sum, quote) => sum + (quote.estimatedCost || 0), 0))}
                                        </td>
                                        <td className="px-3 py-4 text-center text-sm font-bold text-green-200">{formatCurrency(
                                            sortedQuotes.reduce((sum, quote) => {
                                                const profit = (quote.finalAmount || 0) - (quote.estimatedCost || 0);
                                                return sum + profit;
                                            }, 0)
                                        )}</td>
                                        <td className="px-3 py-4 text-center"><span className="inline-block px-3 py-1 text-xs font-bold bg-yellow-500 text-gray-900 rounded-full">{(() => { 
                                            const quotesWithCost = sortedQuotes.filter(quote => (quote.estimatedCost || 0) > 0);
                                            if (quotesWithCost.length === 0) {
                                                return '0.0%';
                                            }

                                            const totalPercentageSum = quotesWithCost.reduce((sum, quote) => {
                                                const cost = quote.estimatedCost || 0;
                                                const profit = (quote.finalAmount || 0) - cost;
                                                const percentage = (profit / cost) * 100;
                                                return sum + percentage;
                                            }, 0);

                                            const averagePercentage = totalPercentageSum / quotesWithCost.length;
                                            return `${averagePercentage.toFixed(1)}%`;
                                        })()}</span></td>
                                        <td className="px-3 py-4 text-center text-sm font-bold"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-12 space-y-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">ניתוח נתונים</h2>
                        <p className="text-gray-600">תרשימים מפורטים של הנתונים הכלליים</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-24">
                        <PieChartComponent data={prepareRevenueByClientData()} title="הכנסות לפי לקוח (הצעות מאושרות)" description="התפלגות ההכנסות בין הלקוחות" chartType="revenue" />
                        <PieChartComponent data={prepareCostByClientData()} title="עלויות לפי לקוח (הצעות מאושרות)" description="התפלגות העלויות בין הלקוחות" chartType="cost" />
                        <PieChartComponent data={prepareProfitByClientData()} title="רווח לפי לקוח (הצעות מאושרות)" description="התפלגות הרווח בין הלקוחות" chartType="profit" />
                        <PieChartComponent data={prepareProfitByStatusData()} title="רווח פוטנציאלי לפי סטטוס" description="התפלגות הרווח הפוטנציאלי לפי סטטוס" chartType="profit" />
                        <PieChartComponent data={prepareStatusData()} title="התפלגות סטטוסים (כללי)" description="חלוקת כלל ההצעות לפי סטטוס" chartType="status" />
                    </div>
                </div>

                <AlertDialog open={deleteAlert.isOpen} onOpenChange={(isOpen) => setDeleteAlert({ ...deleteAlert, isOpen })}>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle><AlertDialogDescription>פעולה זו תמחק את הצעת המחיר לצמיתות. לא ניתן לשחזר את הנתונים.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteQuote(deleteAlert.quote)} className="bg-red-600 hover:bg-red-700">מחק</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
