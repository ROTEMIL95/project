
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Landmark, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Users, Loader2, Edit, Save, X, Trash2, CalendarIcon, Filter, ChevronDown, FileText, CheckCircle, XCircle, Clock, Send, Eye, ArrowUp, ArrowDown, CircleDollarSign, Percent, Archive } from 'lucide-react';
import { FinancialTransaction } from '@/api/entities';
import { Quote } from '@/api/entities';
import { User } from '@/api/entities';
import { useUser } from '@/components/utils/UserContext';
import StatCard from '@/components/finance/StatCard';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subMonths, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount || 0);
};

const COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#f97316'];
const REVENUE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280', '#06b6d4', '#6366f1'];

const statusOptions = {
    'אושר': { label: 'אושר', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="ml-2 h-4 w-4" /> },
    'בוטל': { label: 'בוטל', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="ml-2 h-4 w-4" /> },
    'נדחה': { label: 'נדחה', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Archive className="ml-2 h-4 w-4" /> },
    'נשלח': { label: 'נשלח', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Send className="ml-2 h-4 w-4" /> },
    'טיוטה': { label: 'טיוטה', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <FileText className="ml-2 h-4 w-4" /> },
};


export default function Finance() {
    const { user: currentUser, loading: userLoading } = useUser();
    const [transactions, setTransactions] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States for inline editing
    const [editingId, setEditingId] = useState(null);
    const [editedData, setEditedData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    // State for aggregated costs from quotes
    const [aggregatedCosts, setAggregatedCosts] = useState({
        materials: 0,
        labor: 0,
        itemOverheads: 0,
        projectVariables: 0,
    });

    // States for drill-down functionality
    const [selectedCostType, setSelectedCostType] = useState(null);
    const [detailedBreakdown, setDetailedBreakdown] = useState({});

    // States for time filters
    const [timeFilter, setTimeFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({
        from: null,
        to: null
    });
    
    // States for profitability filters
    const [profitFilter, setProfitFilter] = useState('all');
    const [customProfitRange, setCustomProfitRange] = useState({
        min: '',
        max: ''
    });
    const [revenueFilter, setRevenueFilter] = useState('all');
    const [customRevenueRange, setCustomRevenueRange] = useState({
        min: '',
        max: ''
    });
    const [projectTypeFilter, setProjectTypeFilter] = useState('all');
    
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [activeChart, setActiveChart] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: 'closingDate', direction: 'desc' });

    // Navigation hook
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const user = await User.me();
                setCurrentUser(user);

                if (user && user.email) {
                    await loadTransactions(user);
                    await loadQuotes(user);
                } else {
                    throw new Error("User not authenticated or email missing.");
                }
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
                setError(err.message || "שגיאה בטעינת נתוני המשתמש. אנא נסה/י שוב מאוחר יותר.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const loadTransactions = async (user) => {
        if (!user || !user.email) {
            setTransactions([]);
            return;
        }
        try {
            const data = await FinancialTransaction.filter({ created_by: user.email }, '-closingDate');
            setTransactions(data);
        } catch (err) {
            console.error("Failed to fetch financial transactions:", err);
            setTransactions([]);
        }
    };

    const loadQuotes = async (user) => {
        if (!user || !user.email) {
            setQuotes([]);
            return;
        }
        try {
            const quotesData = await Quote.filter({ created_by: user.email }, '-created_date');
            setQuotes(quotesData || []);
        } catch (err) {
            console.error("Failed to fetch quotes:", err);
            setQuotes([]);
        }
    };

    // Function to apply time filters
    const applyTimeFilter = (transactionsList, filterType, customRange = null) => {
        const now = new Date();
        let startDate, endDate;

        switch (filterType) {
            case '1month':
                startDate = subMonths(now, 1);
                endDate = now;
                break;
            case '3months':
                startDate = subMonths(now, 3);
                endDate = now;
                break;
            case '6months':
                startDate = subMonths(now, 6);
                endDate = now;
                break;
            case '1year':
                startDate = subMonths(now, 12);
                endDate = now;
                break;
            case 'custom':
                if (customRange && customRange.from && customRange.to) {
                    startDate = customRange.from;
                    endDate = new Date(customRange.to);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    return transactionsList;
                }
                break;
            case 'all':
            default:
                return transactionsList;
        }

        return transactionsList.filter(transaction => {
            const transactionDate = new Date(transaction.closingDate);
            if (isNaN(transactionDate.getTime())) {
                console.warn(`Invalid closingDate for transaction ID: ${transaction.id}, Date: ${transaction.closingDate}`);
                return false;
            }
            return isWithinInterval(transactionDate, { start: startDate, end: endDate });
        });
    };

    // Function to apply profitability filters
    const applyProfitabilityFilter = (transactionsList, filters) => {
        let filtered = [...transactionsList];

        // Apply profit percentage filter
        if (filters.profitFilter !== 'all') {
            filtered = filtered.filter(transaction => {
                const totalProfitForTransaction = calculateTotalProfitForTransaction(transaction);
                const transactionCostForProfitability = transaction.estimatedCost || 0;
                
                let profitPercent;
                if (transactionCostForProfitability > 0) {
                    profitPercent = (totalProfitForTransaction / transactionCostForProfitability) * 100;
                } else {
                    profitPercent = (totalProfitForTransaction > 0 ? Infinity : 0);
                }
                
                switch (filters.profitFilter) {
                    case 'low':
                        return profitPercent >= 0 && profitPercent <= 15;
                    case 'medium':
                        return profitPercent > 15 && profitPercent <= 25;
                    case 'high':
                        return profitPercent > 25 || profitPercent === Infinity;
                    case 'negative':
                        return profitPercent < 0;
                    case 'custom':
                        const minProfit = parseFloat(filters.customProfitRange.min);
                        const maxProfit = parseFloat(filters.customProfitRange.max);
                        const isMinValid = !isNaN(minProfit);
                        const isMaxValid = !isNaN(maxProfit);

                        if (isMinValid && isMaxValid) return profitPercent >= minProfit && profitPercent <= maxProfit;
                        if (isMinValid) return profitPercent >= minProfit;
                        if (isMaxValid) return profitPercent <= maxProfit;
                        return true;
                    default:
                        return true;
                }
            });
        }

        // Apply revenue amount filter
        if (filters.revenueFilter !== 'all') {
            filtered = filtered.filter(transaction => {
                const revenue = transaction.revenue || 0;
                
                switch (filters.revenueFilter) {
                    case 'small':
                        return revenue <= 50000;
                    case 'medium':
                        return revenue > 50000 && revenue <= 150000;
                    case 'large':
                        return revenue > 150000;
                    case 'custom':
                        const minRevenue = parseFloat(filters.customRevenueRange.min);
                        const maxRevenue = parseFloat(filters.customRevenueRange.max);
                        const isMinValid = !isNaN(minRevenue);
                        const isMaxValid = !isNaN(maxRevenue);

                        if (isMinValid && isMaxValid) return revenue >= minRevenue && revenue <= maxRevenue;
                        if (isMinValid) return revenue >= minRevenue;
                        if (isMaxValid) return revenue <= maxRevenue;
                        return true;
                    default:
                        return true;
                }
            });
        }

        return filtered;
    };

    // Function to apply project type filter
    const applyProjectTypeFilter = (transactionsList, filter) => {
        if (filter === 'all') {
            return transactionsList;
        }
        return transactionsList.filter(t => t.projectType === filter);
    };

    // Combined filter function
    const applyAllFilters = (transactionsList) => {
        let filtered = applyTimeFilter(transactionsList, timeFilter, customDateRange);
        filtered = applyProfitabilityFilter(filtered, {
            profitFilter,
            customProfitRange,
            revenueFilter,
            customRevenueRange
        });
        filtered = applyProjectTypeFilter(filtered, projectTypeFilter);
        return filtered;
    };

    // Update filtered transactions when any filter changes
    useEffect(() => {
        const filtered = applyAllFilters(transactions);
        setFilteredTransactions(filtered);
    }, [transactions, timeFilter, customDateRange, profitFilter, customProfitRange, revenueFilter, customRevenueRange, projectTypeFilter, quotes]);

    // Function to calculate total profit for a single transaction including variable costs
    const calculateTotalProfitForTransaction = useCallback((transaction) => {
        if (!transaction.quoteId) {
            return (transaction.revenue || 0) - (transaction.estimatedCost || 0);
        }

        const linkedQuote = quotes.find(q => q.id === transaction.quoteId);
        
        if (!linkedQuote) {
            return (transaction.revenue || 0) - (transaction.estimatedCost || 0);
        }

        let totalQuoteCost = 0;

        if (linkedQuote.items && Array.isArray(linkedQuote.items)) {
            for (const item of linkedQuote.items) {
                totalQuoteCost += (item.materialCost || 0);
                totalQuoteCost += (item.laborCost || 0);
                totalQuoteCost += (item.additionalCost || 0);
                totalQuoteCost += (item.fixedCostsTotal || 0);
            }
        }

        if (linkedQuote.projectComplexities && 
            linkedQuote.projectComplexities.additionalCostDetails && 
            Array.isArray(linkedQuote.projectComplexities.additionalCostDetails)) {
            for (const detail of linkedQuote.projectComplexities.additionalCostDetails) {
                totalQuoteCost += (detail.contractorCost || detail.cost || 0);
            }
        }
        
        return (transaction.revenue || 0) - totalQuoteCost;
    }, [quotes]);

    // useMemo for sorting transactions
    const sortedTransactions = useMemo(() => {
        let sortableItems = [...filteredTransactions];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'profitPercent') {
                    const aTotalProfit = (a.revenue || 0) - (a.estimatedCost || 0);
                    const bTotalProfit = (b.revenue || 0) - (b.estimatedCost || 0);
                    const aTotalCost = a.estimatedCost || 0;
                    const bTotalCost = b.estimatedCost || 0;
                    
                    aValue = aTotalCost > 0 ? (aTotalProfit / aTotalCost) * 100 : (aTotalProfit > 0 ? Infinity : 0);
                    bValue = bTotalCost > 0 ? (bTotalProfit / bTotalCost) * 100 : (bTotalProfit > 0 ? Infinity : 0);
                }
                
                if (sortConfig.key === 'estimatedProfit') {
                    aValue = (a.revenue || 0) - (a.estimatedCost || 0);
                    bValue = (b.revenue || 0) - (b.estimatedCost || 0);
                }
                
                if (sortConfig.key === 'closingDate') {
                    aValue = new Date(a.closingDate);
                    bValue = new Date(b.closingDate);
                }

                if (typeof aValue === 'string' && typeof bValue === 'string' && 
                    (sortConfig.key === 'projectName' || sortConfig.key === 'clientName')) {
                    return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredTransactions, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
            setSortConfig({ key: null, direction: 'desc' });
            return;
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        if (sortConfig.direction === 'asc') {
            return <ArrowUp className="h-4 w-4 text-gray-600" />;
        }
        return <ArrowDown className="h-4 w-4 text-gray-600" />;
    };

    const profitBreakdownData = useMemo(() => {
        if (!detailedBreakdown || !detailedBreakdown.revenue) {
            return { data: [], total: 0 };
        }

        const profitMap = {};

        const allCategories = new Set([
            ...Object.keys(detailedBreakdown.materials || {}),
            ...Object.keys(detailedBreakdown.labor || {}),
            ...Object.keys(detailedBreakdown.itemOverheads || {}),
            ...Object.keys(detailedBreakdown.revenue || {}).filter(k => !k.startsWith('הכנסה מ:')),
        ]);

        for (const category of allCategories) {
            const revenue = detailedBreakdown.revenue[category] || 0;
            const materialCost = detailedBreakdown.materials[category] || 0;
            const laborCost = detailedBreakdown.labor[category] || 0;
            const overheadCost = detailedBreakdown.itemOverheads[category] || 0;
            const totalCost = materialCost + laborCost + overheadCost;
            const profit = revenue - totalCost;
            
            if (profit !== 0) {
                profitMap[category] = (profitMap[category] || 0) + profit;
            }
        }

        const totalRevenueFromVariables = Object.entries(detailedBreakdown.revenue)
            .filter(([key]) => key.startsWith('הכנסה מ:'))
            .reduce((sum, [, value]) => sum + value, 0);

        const totalCostFromVariables = Object.values(detailedBreakdown.projectVariables || {})
            .reduce((sum, cost) => sum + cost, 0);

        const variableProfit = totalRevenueFromVariables - totalCostFromVariables;
        if (variableProfit !== 0) {
            profitMap['עלויות משתנות'] = variableProfit;
        }

        const PROFIT_COLORS = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#64748b'];

        const chartData = Object.entries(profitMap)
            .filter(([_, value]) => value > 0)
            .map(([name, value], index) => ({
                name,
                value,
                color: PROFIT_COLORS[index % PROFIT_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);

        const totalProfit = chartData.reduce((sum, item) => sum + item.value, 0);
        
        return { data: chartData, total: totalProfit };

    }, [detailedBreakdown]);

    // Update calculateAggregatedCosts to use filtered transactions
    useEffect(() => {
        if (filteredTransactions) {
            calculateAggregatedCosts(filteredTransactions);
        }
    }, [filteredTransactions, quotes]);

    const calculateAggregatedCosts = async (transactionsList) => {
        let totalMaterialCost = 0;
        let totalLaborCost = 0;
        let totalItemOverheads = 0;
        let totalProjectVariableCosts = 0;

        let materialsByCategory = {};
        let laborByCategory = {};
        let overheadsByCategory = {};
        let projectVariablesByType = {};
        
        let revenueByCategory = {};

        const relevantQuoteIds = new Set(transactionsList.map(t => t.quoteId).filter(Boolean));
        const quotesToProcess = quotes.filter(q => relevantQuoteIds.has(q.id));

        for (const quote of quotesToProcess) {
            if (quote) {
                if (quote.items && Array.isArray(quote.items)) {
                    for (const item of quote.items) {
                        const categoryName = getCategoryName(item.categoryId);
                        
                        totalMaterialCost += (item.materialCost || 0);
                        totalLaborCost += (item.laborCost || 0);

                        const combinedOverhead = (item.additionalCost || 0) + (item.fixedCostsTotal || 0);
                        totalItemOverheads += combinedOverhead;

                        materialsByCategory[categoryName] = (materialsByCategory[categoryName] || 0) + (item.materialCost || 0);
                        laborByCategory[categoryName] = (laborByCategory[categoryName] || 0) + (item.laborCost || 0);
                        
                        overheadsByCategory[categoryName] = (overheadsByCategory[categoryName] || 0) + combinedOverhead;
                        
                        const itemRevenue = item.totalPrice || 0;
                        revenueByCategory[categoryName] = (revenueByCategory[categoryName] || 0) + itemRevenue;
                    }
                }
                
                if (quote.projectComplexities && 
                    quote.projectComplexities.additionalCostDetails && 
                    Array.isArray(quote.projectComplexities.additionalCostDetails)) {
                    for (const detail of quote.projectComplexities.additionalCostDetails) {
                        const actualCost = detail.contractorCost || detail.cost || 0;
                        totalProjectVariableCosts += actualCost;
                        
                        const costTypeName = detail.description || detail.type || 'אחר';
                        projectVariablesByType[costTypeName] = (projectVariablesByType[costTypeName] || 0) + actualCost;

                        const revenueFromDetail = detail.cost || 0;
                        if (revenueFromDetail > 0) {
                            const revenueTypeName = `הכנסה מ: ${detail.description || detail.type || 'עלויות משתנות'}`;
                            revenueByCategory[revenueTypeName] = (revenueByCategory[revenueTypeName] || 0) + revenueFromDetail;
                        }
                    }
                }
            }
        }

        setAggregatedCosts({
            materials: totalMaterialCost,
            labor: totalLaborCost,
            itemOverheads: totalItemOverheads,
            projectVariables: totalProjectVariableCosts,
        });

        setDetailedBreakdown({
            materials: materialsByCategory,
            labor: laborByCategory,
            itemOverheads: overheadsByCategory,
            projectVariables: projectVariablesByType,
            revenue: revenueByCategory
        });
    };

    // Helper function to get category name
    const getCategoryName = (categoryId) => {
        const categoryMap = {
            'cat_paint_plaster': 'צבע וטיח',
            'cat_tiling': 'ריצוף וחיפוי',
            'cat_demolition': 'הריסה ופינוי',
            'cat_electricity': 'חשמל',
            'cat_plumbing': 'אינסטלציה',
            'cat_construction': 'בינוי כללי'
        };
        return categoryMap[categoryId] || 'אחר';
    };

    const handleEditClick = (transaction) => {
        setEditingId(transaction.id);
        setEditedData({
            revenue: transaction.revenue,
            estimatedCost: transaction.estimatedCost,
        });
    };

    const handleCancelClick = () => {
        setEditingId(null);
        setEditedData({});
    };

    const handleDataChange = (e) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveClick = async (transactionId) => {
        setIsSaving(true);
        try {
            const revenue = parseFloat(editedData.revenue || 0);
            const estimatedCost = parseFloat(editedData.estimatedCost || 0);

            if (isNaN(revenue) || isNaN(estimatedCost)) {
                alert("נא להזין ערכים מספריים חוקיים.");
                return;
            }

            const updatedData = {
                revenue,
                estimatedCost,
                estimatedProfit: revenue - estimatedCost,
            };

            await FinancialTransaction.update(transactionId, updatedData);

            setTransactions(prev =>
                prev.map(t =>
                    t.id === transactionId ? { ...t, ...updatedData } : t
                )
            );

            setEditingId(null);
            setEditedData({});

        } catch (error) {
            console.error("Error saving transaction:", error);
            alert("שגיאה בשמירת השינויים.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = async (transactionId) => {
        setIsDeleting(transactionId);
        try {
            // נסה למחוק את הטרנזקציה
            try {
                await FinancialTransaction.delete(transactionId);
            } catch (error) {
                // אם השגיאה היא 404, זה אומר שהטרנזקציה כבר נמחקה
                if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('Entity not found')) {
                    console.log("Transaction already deleted, continuing with cleanup");
                } else {
                    throw error;
                }
            }

            // הסר את הטרנזקציה מהרשימה המקומית (בכל מקרה)
            setTransactions(prevTransactions => 
                prevTransactions.filter(transaction => transaction.id !== transactionId)
            );
            
            alert("הטרנזקציה נמחקה בהצלחה!");
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert("אירעה שגיאה במחיקת הטרנזקציה. הטרנזקציה עשויה להיות כבר מחוקה.");
            
            // גם במקרה של שגיאה, נסה להסיר מהרשימה המקומית למקרה שהטרנזקציה אכן נמחקה
            setTransactions(prevTransactions => 
                prevTransactions.filter(transaction => transaction.id !== transactionId)
            );
        } finally {
            setIsDeleting(null);
        }
    };

    const handleStatusChange = async (transaction, newStatus) => {
        if (!transaction.quoteId) {
            alert("לא ניתן לשנות סטטוס לעסקה זו מכיוון שאינה מקושרת להצעת מחיר.");
            return;
        }
        setUpdatingStatusId(transaction.id);

        try {
            let shouldDeleteFinancialTransaction = false;

            // עדכן את סטטוס ההצעה
            try {
                await Quote.update(transaction.quoteId, { status: newStatus });
                if (newStatus !== 'אושר') {
                    shouldDeleteFinancialTransaction = true;
                }
            } catch (error) {
                if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('Entity not found')) {
                    console.log("Quote not found, might be already deleted or never existed. Will attempt to delete associated financial transaction.");
                    shouldDeleteFinancialTransaction = true; // If quote not found, its associated financial transaction should be deleted
                } else {
                    throw error; // Re-throw other errors
                }
            }

            // אם הסטטוס לא "אושר" או ההצעה נמחקה, מחק את הטרנזקציה הפיננסית
            if (shouldDeleteFinancialTransaction) {
                try {
                    await FinancialTransaction.delete(transaction.id);
                } catch (deleteError) {
                    if (deleteError.message.includes('404') || deleteError.message.includes('not found') || deleteError.message.includes('Entity not found')) {
                        console.log("Financial transaction already deleted, no action needed.");
                    } else {
                        throw deleteError; // Re-throw other errors
                    }
                }
            }
            
            // רענן את כל הנתונים כדי לשקף שינויים בכל מקום
            await loadTransactions(currentUser);
            await loadQuotes(currentUser);

        } catch (err) {
            console.error("Failed to update status:", err);
            alert("שגיאה בעדכון הסטטוס. נסה שנית.");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // Handle pie chart click for costs
    const handlePieClick = (data, index) => {
        const costType = ['materials', 'labor', 'itemOverheads', 'projectVariables'][index];
        setSelectedCostType(selectedCostType === costType ? null : costType);
    };

    // Handle time filter change
    const handleTimeFilterChange = (newFilter) => {
        setTimeFilter(newFilter);
        if (newFilter !== 'custom') {
            setCustomDateRange({ from: null, to: null });
        }
    };

    // Handle custom date range change
    const handleCustomDateRangeChange = (range) => {
        setCustomDateRange(range);
        if (range?.from && range?.to) {
            setTimeFilter('custom');
        }
    };

    // Calculate quote statistics
    const calculateQuoteStats = () => {
        const totalQuotes = quotes.length;
        
        if (totalQuotes === 0) {
            return {
                totalQuotes: 0,
                statusCounts: {
                    'טיוטה': 0, 
                    'נשלח': 0,
                    'אושר': 0,
                    'נדחה': 0,
                    'בוטל': 0, 
                },
                statusValues: {
                    'טיוטה': 0, 
                    'נשלח': 0,
                    'אושר': 0,
                    'נדחה': 0,
                    'בוטל': 0, 
                },
                approvalRate: 0,
                sentQuotes: 0,
                approvedQuotes: 0,
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                averageProfitMargin: 0,
            };
        }
        
        const statusCounts = {
            'טיוטה': quotes.filter(q => q.status === 'טיוטה').length, 
            'נשלח': quotes.filter(q => q.status === 'נשלח').length,
            'אושר': quotes.filter(q => q.status === 'אושר').length,
            'נדחה': quotes.filter(q => q.status === 'נדחה').length,
            'בוטל': quotes.filter(q => q.status === 'בוטל').length, 
        };

        const statusValues = {
            'טיוטה': quotes.filter(q => q.status === 'טיוטה').reduce((sum, q) => sum + (q.finalAmount || 0), 0), 
            'נשלח': quotes.filter(q => q.status === 'נשלח').reduce((sum, q) => sum + (q.finalAmount || 0), 0),
            'אושר': quotes.filter(q => q.status === 'אושר').reduce((sum, q) => sum + (q.finalAmount || 0), 0),
            'נדחה': quotes.filter(q => q.status === 'נדחה').reduce((sum, q) => sum + (q.finalAmount || 0), 0),
            'בוטל': quotes.filter(q => q.status === 'בוטל').reduce((sum, q) => sum + (q.finalAmount || 0), 0), 
        };

        const sentQuotes = statusCounts['נשלח'] + statusCounts['אושר'] + statusCounts['נדחה'];
        const approvedQuotes = statusCounts['אושר'];
        const approvalRate = sentQuotes > 0 ? (approvedQuotes / sentQuotes) * 100 : 0;

        const approvedQuotesList = quotes.filter(q => q.status === 'אושר');
        let totalApprovedRevenue = 0;
        let totalApprovedCost = 0;

        for (const quote of approvedQuotesList) {
            totalApprovedRevenue += (quote.finalAmount || 0);

            let quoteCost = 0;
            if (quote.items && Array.isArray(quote.items)) {
                for (const item of quote.items) {
                    quoteCost += (item.materialCost || 0);
                    quoteCost += (item.laborCost || 0);
                    quoteCost += (item.additionalCost || 0);
                    quoteCost += (item.fixedCostsTotal || 0);
                }
            }
            if (quote.projectComplexities && quote.projectComplexities.additionalCostDetails && Array.isArray(quote.projectComplexities.additionalCostDetails)) {
                for (const detail of quote.projectComplexities.additionalCostDetails) {
                    quoteCost += (detail.contractorCost || detail.cost || 0);
                }
            }
            totalApprovedCost += quoteCost;
        }

        const totalApprovedProfit = totalApprovedRevenue - totalApprovedCost;
        const averageApprovedProfitMargin = totalApprovedCost > 0 ? (totalApprovedProfit / totalApprovedCost) * 100 : 0;

        return {
            totalQuotes,
            statusCounts,
            statusValues,
            approvalRate,
            sentQuotes,
            approvedQuotes,
            totalRevenue: totalApprovedRevenue,
            totalCost: totalApprovedCost,
            totalProfit: totalApprovedProfit,
            averageProfitMargin: averageApprovedProfitMargin.toFixed(1),
        };
    };

    const totalRevenueDashboard = filteredTransactions.reduce((sum, t) => sum + (t.revenue || 0), 0);
    
    const costBreakdownData = [
        { name: 'חומרים', value: aggregatedCosts.materials, color: COLORS[0] },
        { name: 'כוח אדם', value: aggregatedCosts.labor, color: COLORS[1] },
        { name: 'עלויות כלליות וקבועות', value: aggregatedCosts.itemOverheads, color: COLORS[2] },
        { name: 'עלויות פרויקט משתנות', value: aggregatedCosts.projectVariables, color: COLORS[3] },
    ].filter(d => d.value > 0);

    const totalCosts = costBreakdownData.reduce((sum, item) => sum + item.value, 0);
    
    const totalProfitDashboard = totalRevenueDashboard - totalCosts;
    const profitMarginDashboard = totalCosts > 0 ? (totalProfitDashboard / totalCosts) * 100 : (totalProfitDashboard > 0 ? Infinity : 0);

    // Get detailed breakdown for selected cost type
    const getSelectedBreakdown = () => {
        if (!selectedCostType || !detailedBreakdown[selectedCostType]) return [];

        const breakdown = detailedBreakdown[selectedCostType];
        return Object.entries(breakdown)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    // Revenue breakdown data
    const revenueBreakdownData = Object.entries(detailedBreakdown.revenue || {})
        .filter(([name, value]) => value > 0)
        .map(([name, value], index) => ({
            name: name.startsWith('הכנסה מ:') ? name.replace('הכנסה מ: ', '') : name,
            value,
            color: REVENUE_COLORS[index % REVENUE_COLORS.length]
        }))
        .sort((a, b) => b.value - a.value);

    const totalRevenueChart = revenueBreakdownData.reduce((sum, item) => sum + item.value, 0);

    const barChartData = filteredTransactions.slice(0, 10).map(t => {
        const relatedQuote = quotes.find(q => q.id === t.quoteId);
        const projectAddress = relatedQuote?.projectAddress || t.projectName;
        
        const displayAddress = projectAddress && projectAddress.length > 25 
            ? projectAddress.substring(0, 25) + '...' 
            : projectAddress || t.projectName;
            
        return {
            name: displayAddress,
            הכנסות: t.revenue,
            עלויות: t.estimatedCost,
            רווח: calculateTotalProfitForTransaction(t),
            date: t.closingDate,
            quoteId: t.quoteId,
        };
    }).reverse();

    const quoteStats = calculateQuoteStats();
    
    // Data for Revenue chart
    const revenueByProjectData = filteredTransactions.map(t => ({
        name: t.projectName.length > 20 ? t.projectName.substring(0, 20) + '...' : t.projectName,
        הכנסה: t.revenue || 0,
    })).filter(t => t.הכנסה > 0).sort((a,b) => b.הכנסה - a.הכנסה).slice(0, 15);

    // Data for Profit chart
    const profitByProjectData = filteredTransactions.map(t => ({
        name: t.projectName.length > 20 ? t.projectName.substring(0, 20) + '...' : t.projectName,
        רווח: calculateTotalProfitForTransaction(t) || 0,
    })).sort((a,b) => b.רווח - a.רווח).slice(0, 15);

    const getChartTitle = () => {
        switch(activeChart) {
            case 'revenue': return 'פירוט הכנסות לפי פרויקט';
            case 'costs': return 'פילוח עלויות לפי סוג';
            case 'profit': return 'פירוט רווח לפי פרויקט';
            default: return '';
        }
    };

    const handleBarClick = (data) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const quoteId = data.activePayload[0].payload.quoteId;
            if (quoteId) {
                navigate(createPageUrl(`QuoteView?id=${quoteId}`));
            }
        }
    };

    // Custom Tooltip for Bar Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200">
                    <p className="font-bold text-gray-800 mb-1">{label}</p>
                    <p className="text-sm text-gray-500 mb-3">
                        תאריך סגירה: {format(new Date(payload[0].payload.date), 'dd/MM/yyyy', { locale: he })}
                    </p>
                    <Separator className="mb-3" />
                    {payload.slice().reverse().map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-gray-600">{entry.name}:</span>
                            </div>
                            <span className="font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderCustomLegend = (props) => {
        const { payload } = props;
        
        const colorMap = {
            'הכנסות': '#22c55e',
            'עלויות': '#f97316',
            'רווח': '#6366f1'
        };

        return (
            <div className="flex justify-center items-center gap-6 pt-4">
            {payload.map((entry, index) => (
                <div key={`item-${index}`} className="flex items-center gap-2 text-sm text-gray-600">
                <div style={{ backgroundColor: colorMap[entry.value] || entry.color }} className="w-3 h-3 rounded-sm" />
                <span>{entry.value}</span>
                </div>
            ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">טוען נתונים פיננסיים...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg shadow-md">
                    <p className="text-xl font-semibold text-red-700 mb-4">שגיאה בטעינת הנתונים</p>
                    <p className="text-sm text-gray-700">{error}</p>
                    <p className="mt-4 text-sm text-gray-500">נסה לרענן את העמוד, או פנה לתמיכה אם הבעיה נמשכת.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50" dir="rtl">
            <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">לוח מחוונים פיננסי</h1>
                        <p className="text-gray-600 text-lg">סקירה כללית של ביצועיפ פיננסיים וניהול עסקאות</p>
                    </div>
                </header>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <StatCard
                        title="סך הכנסות"
                        value={formatCurrency(quoteStats.totalRevenue)}
                        color="green"
                    />
                    <StatCard
                        title="עלויות"
                        value={formatCurrency(quoteStats.totalCost)}
                        color="orange"
                    />
                    <StatCard
                        title="רווח נקי"
                        value={formatCurrency(quoteStats.totalProfit)}
                        color="indigo"
                    />
                    <StatCard
                        title="אחוז רווח ממוצע"
                        value={`${quoteStats.averageProfitMargin}%`}
                        color="purple"
                    />
                </div>

            {/* Quote Status Dashboard Card */}
            <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 border-indigo-200">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-xl text-indigo-800">
                        <div className="p-2 bg-indigo-200 rounded-lg">
                            <FileText className="h-6 w-6 text-indigo-700" />
                        </div>
                        סטטוס הצעות מחיר
                    </CardTitle>
                    <CardDescription className="text-indigo-600">
                        {quotes.length > 0 ? 
                            "מעקב אחר ביצועי הצעות המחיר וקצב ההמרה - לחץ על כל כרטיס לפירוט" :
                            "עדיין אין הצעות מחיר. צור הצעה חדשה כדי לראות נתונים כאן"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Total Quotes */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes'))}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-700 transition-colors">סה"כ הצעות</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-800 group-hover:text-indigo-800 transition-colors">{quoteStats.totalQuotes}</div>
                            <div className="text-xs text-gray-400 mt-1">לחץ לכל ההצעות</div>
                        </button>

                        {/* Draft Quotes */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes?status=טיוטה'))}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">טיוטות</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-600 group-hover:text-gray-800 transition-colors">{quoteStats.statusCounts['טיוטה']}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(quoteStats.statusValues['טיוטה'])}
                            </div>
                        </button>

                        {/* Sent Quotes */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes?status=נשלח'))}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Send className="h-4 w-4 text-blue-500 group-hover:text-blue-700 transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-700 transition-colors">נשלחו</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-600 group-hover:text-blue-800 transition-colors">{quoteStats.statusCounts['נשלח']}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(quoteStats.statusValues['נשלח'])}
                            </div>
                        </button>

                        {/* Approved Quotes */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes?status=אושר'))}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-500 group-hover:text-green-700 transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-green-700 transition-colors">אושרו</span>
                            </div>
                            <div className="text-2xl font-bold text-green-600 group-hover:text-green-800 transition-colors">{quoteStats.statusCounts['אושר']}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(quoteStats.statusValues['אושר'])}
                            </div>
                        </button>

                        {/* Rejected Quotes */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes?status=נדחה'))}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <XCircle className="h-4 w-4 text-red-500 group-hover:text-red-700 transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-red-700 transition-colors">נדחו</span>
                            </div>
                            <div className="text-2xl font-bold text-red-600 group-hover:text-red-800 transition-colors">{quoteStats.statusCounts['נדחה']}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(quoteStats.statusValues['נדחה'])}
                            </div>
                        </button>

                        {/* Cancelled Quotes */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes?status=בוטל'))}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Archive className="h-4 w-4 text-orange-500 group-hover:text-orange-700 transition-colors" />
                                <span className="text-sm font-medium text-gray-600 group-hover:text-orange-700 transition-colors">בוטלו</span>
                            </div>
                            <div className="text-2xl font-bold text-orange-600 group-hover:text-orange-800 transition-colors">{quoteStats.statusCounts['בוטל']}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(quoteStats.statusValues['בוטל'])}
                            </div>
                        </button>

                        {/* Approval Rate */}
                        <button
                            onClick={() => navigate(createPageUrl('SentQuotes?status=אושר'))}
                            className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-3 border border-green-200 hover:from-green-200 hover:to-emerald-200 hover:shadow-md transition-all duration-200 text-right group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-green-600 group-hover:text-green-800 transition-colors" />
                                <span className="text-sm font-medium text-green-700 group-hover:text-green-900 transition-colors">אחוז אישור</span>
                            </div>
                            <div className="text-2xl font-bold text-green-700 group-hover:text-green-900 transition-colors">
                                {quoteStats.approvalRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                                {quoteStats.approvedQuotes} מתוך {quoteStats.sentQuotes} שנשלחו
                            </div>
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Collapsible Filters Section */}
            <Collapsible
                open={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
                className="w-full"
            >
                <Card className="shadow-lg">
                    <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between cursor-pointer rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="text-right">
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-indigo-600" />
                                    סינון נתונים
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {isFiltersOpen ? "לחץ להסתרת אפשרויות הסינון" : "לחץ לפתיחת אפשרויות סינון"}
                                </CardDescription>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isFiltersOpen ? 'rotate-180' : ''}`} />
                        </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                        <CardContent className="space-y-6 pt-4">
                            {/* Main filters row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                                {/* Time Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="timeFilter">טווח זמן</Label>
                                    <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
                                        <SelectTrigger id="timeFilter">
                                            <SelectValue placeholder="בחר טווח" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">הכל</SelectItem>
                                            <SelectItem value="1month">חודש אחרון</SelectItem>
                                            <SelectItem value="3months">3 חודשים אחרונים</SelectItem>
                                            <SelectItem value="6months">6 חודשים אחרונים</SelectItem>
                                            <SelectItem value="1year">שנה אחרונה</SelectItem>
                                            <SelectItem value="custom">טווח מותאם אישית</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Profit Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="profitFilter">אחוז רווח</Label>
                                    <Select value={profitFilter} onValueChange={setProfitFilter}>
                                        <SelectTrigger id="profitFilter">
                                            <SelectValue placeholder="בחר טווח רווח" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">כל הרווחים</SelectItem>
                                            <SelectItem value="negative">הפסדים (מתחת ל-0%)</SelectItem>
                                            <SelectItem value="low">רווח נמוך (0-15%)</SelectItem>
                                            <SelectItem value="medium">רווח בינוני (15-25%)</SelectItem>
                                            <SelectItem value="high">רווח גבוה (מעל 25%)</SelectItem>
                                            <SelectItem value="custom">טווח מותאם אישית</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Revenue (Size) Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="revenueFilter">גודל פרויקט (הכנסה)</Label>
                                    <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                                        <SelectTrigger id="revenueFilter">
                                            <SelectValue placeholder="בחר גודל פרויקט" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">כל הגדלים</SelectItem>
                                            <SelectItem value="small">פרויקטים קטנים (עד 50,000 ₪)</SelectItem>
                                            <SelectItem value="medium">פרויקטים בינוניים (50,000-150,000 ₪)</SelectItem>
                                            <SelectItem value="large">פרויקטים גדולים (מעל 150,000 ₪)</SelectItem>
                                            <SelectItem value="custom">טווח מותאם אישית</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Project Type Filter */}
                                <div className="space-y-2">
                                    <Label htmlFor="projectTypeFilter">סוג פרויקט</Label>
                                    <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
                                        <SelectTrigger id="projectTypeFilter">
                                            <SelectValue placeholder="בחר סוג פרויקט" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">הכל</SelectItem>
                                            <SelectItem value="דירה">דירה</SelectItem>
                                            <SelectItem value="משרד">משרד</SelectItem>
                                            <SelectItem value="וילה">וילה</SelectItem>
                                            <SelectItem value="אחר">אחר</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Custom inputs row */}
                            {(timeFilter === 'custom' || profitFilter === 'custom' || revenueFilter === 'custom') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-gray-200">
                                    {timeFilter === 'custom' && (
                                        <div className="lg:col-start-1 space-y-2">
                                            <Label>טווח תאריכים מותאם</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {customDateRange.from ? (
                                                            customDateRange.to ? (
                                                                <>
                                                                    {format(customDateRange.from, 'dd/MM/yy', { locale: he })} - {format(customDateRange.to, 'dd/MM/yy', { locale: he })}
                                                                </>
                                                            ) : (
                                                                format(customDateRange.from, 'dd/MM/yyyy', { locale: he })
                                                            )
                                                        ) : (
                                                            'בחר טווח תאריכים'
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="range"
                                                        selected={customDateRange}
                                                        onSelect={handleCustomDateRangeChange}
                                                        numberOfMonths={2}
                                                        locale={he}
                                                        defaultMonth={customDateRange.from || new Date()}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                    {profitFilter === 'custom' && (
                                        <div className="flex items-end gap-2 lg:col-start-2">
                                            <div className="space-y-2 flex-1">
                                                <Label className="text-sm text-gray-600">מ- (%)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={customProfitRange.min}
                                                    onChange={(e) => setCustomProfitRange(prev => ({...prev, min: e.target.value}))}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <Label className="text-sm text-gray-600">עד (%)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="100"
                                                    value={customProfitRange.max}
                                                    onChange={(e) => setCustomProfitRange(prev => ({...prev, max: e.target.value}))}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {revenueFilter === 'custom' && (
                                        <div className="flex items-end gap-2 lg:col-start-3">
                                            <div className="space-y-2 flex-1">
                                                <Label className="text-sm text-gray-600">מ- (₪)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={customRevenueRange.min}
                                                    onChange={(e) => setCustomRevenueRange(prev => ({...prev, min: e.target.value}))}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <Label className="text-sm text-gray-600">עד (₪)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="1000000"
                                                    value={customRevenueRange.max}
                                                    onChange={(e) => setCustomRevenueRange(prev => ({...prev, max: e.target.value}))}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        {/* Filter Summary */}
                        <CardFooter className="bg-gray-50 p-3 rounded-b-lg border-t">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <span>מציג <span className="font-bold">{filteredTransactions.length}</span> מתוך <span className="font-bold">{transactions.length}</span> עסקאות</span>
                                <Separator orientation="vertical" className="h-4" />
                                <div className="flex flex-wrap gap-2">
                                {timeFilter !== 'all' && (
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                                        זמן: {timeFilter === 'custom' ? 'מותאם' : timeFilter === '1month' ? 'חודש' : timeFilter === '3months' ? '3 חודשים' : timeFilter === '6months' ? '6 חודשים' : 'שנה'}
                                    </span>
                                )}
                                {profitFilter !== 'all' && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                        רווח: {profitFilter === 'low' ? 'נמוך' : profitFilter === 'medium' ? 'בינוני' : profitFilter === 'high' ? 'גבוה' : profitFilter === 'negative' ? 'הפסד' : 'מותאם'}
                                    </span>
                                )}
                                {revenueFilter !== 'all' && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                        גודל: {revenueFilter === 'small' ? 'קטן' : revenueFilter === 'medium' ? 'בינוני' : revenueFilter === 'large' ? 'גדול' : 'מותאם'}
                                    </span>
                                )}
                                {projectTypeFilter !== 'all' && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                        סוג: {projectTypeFilter}
                                    </span>
                                )}
                                </div>
                            </div>
                        </CardFooter>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Transactions Table Section */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>פירוט עסקאות</CardTitle>
                    <CardDescription>רשימת כל הפרויקטים שאושרו ונסגרו. לחץ על כותרת עמודה כדי למיין.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => requestSort('closingDate')}>
                                        <div className="flex items-center gap-2">תאריך סגירה {getSortIcon('closingDate')}</div>
                                    </TableHead>
                                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => requestSort('clientName')}>
                                        <div className="flex items-center gap-2">לקוח {getSortIcon('clientName')}</div>
                                    </TableHead>
                                    <TableHead className="text-green-600 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => requestSort('revenue')}>
                                        <div className="flex items-center gap-2">הכנסה {getSortIcon('revenue')}</div>
                                    </TableHead>
                                    <TableHead className="text-orange-600 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => requestSort('estimatedCost')}>
                                        <div className="flex items-center gap-2">עלויות {getSortIcon('estimatedCost')}</div>
                                    </TableHead>
                                    <TableHead className="text-blue-600 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => requestSort('estimatedProfit')}>
                                        <div className="flex items-center gap-2">רווח {getSortIcon('estimatedProfit')}</div>
                                    </TableHead>
                                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => requestSort('profitPercent')}>
                                        <div className="flex items-center gap-2">אחוז רווח {getSortIcon('profitPercent')}</div>
                                    </TableHead>
                                    <TableHead className="font-semibold">סטטוס</TableHead>
                                    <TableHead className="font-semibold">פעולות</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTransactions.length > 0 ? sortedTransactions.map((transaction) => {
                                    const isEditing = editingId === transaction.id;
                                    const quote = quotes.find(q => q.id === transaction.quoteId);
                                    const currentStatus = quote?.status || 'לא מקושר'; // Default for display if no quote

                                    let totalProfit, totalCostDenominator, displayRevenue, displayCost;
                                    
                                    if (isEditing) {
                                        displayRevenue = parseFloat(editedData.revenue || 0);
                                        displayCost = parseFloat(editedData.estimatedCost || 0);
                                        totalProfit = displayRevenue - displayCost;
                                        totalCostDenominator = displayCost;
                                    } else {
                                        displayRevenue = transaction.revenue || 0;
                                        displayCost = transaction.estimatedCost || 0;
                                        totalProfit = displayRevenue - displayCost;
                                        totalCostDenominator = displayCost;
                                    }
                                    
                                    let profitPercent;
                                    if (totalCostDenominator > 0) {
                                        profitPercent = (totalProfit / totalCostDenominator) * 100;
                                    } else {
                                        profitPercent = (totalProfit > 0 ? Infinity : 0);
                                    }
                                    
                                    const getRowClass = (percent) => {
                                        if (percent > 40) return 'bg-green-50/70 hover:bg-green-100/80';
                                        if (percent > 30) return 'bg-blue-50/70 hover:bg-blue-100/80';
                                        if (percent > 20) return 'bg-yellow-50/70 hover:bg-yellow-100/80';
                                        return 'bg-red-50/70 hover:bg-red-100/80';
                                    };

                                    return (
                                        <TableRow key={transaction.id} className={cn(isEditing ? 'bg-indigo-100' : getRowClass(profitPercent), 'transition-colors duration-200')}>
                                            <TableCell className="font-medium">
                                                {format(new Date(transaction.closingDate), 'dd/MM/yyyy', { locale: he })}
                                            </TableCell>
                                            <TableCell className="text-gray-700">{transaction.clientName}</TableCell>
                                            <TableCell className="text-emerald-600 font-semibold">
                                                {isEditing ? (
                                                    <Input name="revenue" type="number" value={editedData.revenue} onChange={handleDataChange} className="w-32 text-right" />
                                                ) : (
                                                    formatCurrency(displayRevenue)
                                                )}
                                            </TableCell>
                                            <TableCell className="text-amber-600 font-medium">
                                                {isEditing ? (
                                                    <Input name="estimatedCost" type="number" value={editedData.estimatedCost} onChange={handleDataChange} className="w-32 text-right" />
                                                ) : (
                                                    formatCurrency(displayCost)
                                                )}
                                            </TableCell>
                                            <TableCell className="text-blue-600 font-semibold">
                                                {formatCurrency(totalProfit)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        profitPercent > 40 ? 'border-green-400 text-green-800' :
                                                        profitPercent > 30 ? 'border-blue-400 text-blue-800' :
                                                        profitPercent > 20 ? 'border-yellow-400 text-yellow-800' :
                                                        'border-red-400 text-red-800'
                                                    }
                                                >
                                                    {profitPercent === Infinity ? '∞' : profitPercent.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {updatingStatusId === transaction.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                                                ) : quote ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className={cn("w-32 justify-between", statusOptions[currentStatus]?.color)}>
                                                                <span className="truncate">{statusOptions[currentStatus]?.label || 'בחר'}</span>
                                                                <ChevronDown className="mr-auto h-4 w-4 opacity-70" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            {Object.entries(statusOptions).map(([statusKey, { label, icon }]) => (
                                                                <DropdownMenuItem 
                                                                    key={statusKey} 
                                                                    onClick={() => handleStatusChange(transaction, statusKey)}
                                                                    disabled={currentStatus === statusKey}
                                                                    className="flex justify-between"
                                                                >
                                                                    <span>{label}</span>
                                                                    {icon}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <Badge variant="secondary">לא מקושר</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => handleSaveClick(transaction.id)} disabled={isSaving}>
                                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={handleCancelClick}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => handleEditClick(transaction)}>
                                                            <Edit className="h-4 w-4 mr-1" />
                                                            ערוך
                                                        </Button>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-400"
                                                                    disabled={isDeleting === transaction.id}
                                                                >
                                                                    {isDeleting === transaction.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                                    )}
                                                                    מחק
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        פעולה זו תמחק לצמיתות את העסקה "{transaction.projectName}"
                                                                        מהמערכת. פעולה זו לא ניתנת לביטול.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDeleteClick(transaction.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        כן, מחק עסקה
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                                            אין עסקאות התואמות את הסינון הנוכחי.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <tfoot>
                                {sortedTransactions.length > 0 && (
                                    <TableRow className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                        <TableCell colSpan={3} className="text-right text-gray-800">סה"כ</TableCell>
                                        <TableCell className="text-emerald-700">{formatCurrency(totalRevenueDashboard)}</TableCell>
                                        <TableCell className="text-amber-700">{formatCurrency(totalCosts)}</TableCell>
                                        <TableCell className="text-blue-700">{formatCurrency(totalProfitDashboard)}</TableCell>
                                        <TableCell>
                                            <Badge variant="default" className="bg-purple-600 text-white hover:bg-purple-700">
                                                {
                                                    (() => {
                                                        let validTransactions = 0;
                                                        let totalProfitPercentage = 0;
                                                        
                                                        for (const transaction of sortedTransactions) {
                                                            const totalProfit = (transaction.revenue || 0) - (transaction.estimatedCost || 0);
                                                            const totalCostDenominator = transaction.estimatedCost || 0;
                                                            
                                                            if (totalCostDenominator > 0) {
                                                                const profitPercent = (totalProfit / totalCostDenominator) * 100;
                                                                if (!isNaN(profitPercent) && isFinite(profitPercent)) {
                                                                    totalProfitPercentage += profitPercent;
                                                                }
                                                            }
                                                            validTransactions++;
                                                        }
                                                        
                                                        if (validTransactions === 0) return '0';
                                                        
                                                        const averageProfitPercent = totalProfitPercentage / validTransactions;
                                                        return averageProfitPercent.toFixed(1);
                                                    })()
                                                }%
                                            </Badge>
                                        </TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                )}
                            </tfoot>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="space-y-6">
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>פילוח עלויות לפי סוג</CardTitle>
                                <CardDescription>התפלגות העלויות בפרויקטים</CardDescription>
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-bold text-gray-800">
                                    {formatCurrency(totalCosts)}
                                </div>
                                <div className="text-sm text-gray-500">סה״כ עלויות</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={costBreakdownData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        onClick={handlePieClick}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {costBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        formatter={(value, name) => [
                                            formatCurrency(value),
                                            name
                                        ]}
                                        contentStyle={{ 
                                            backgroundColor: '#ffffff', 
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {costBreakdownData.map((entry, index) => {
                                const percentage = totalCosts > 0 ? ((entry.value / totalCosts) * 100).toFixed(1) : 0;
                                return (
                                    <div 
                                        key={entry.name} 
                                        className={`text-center cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                                            selectedCostType === ['materials', 'labor', 'itemOverheads', 'projectVariables'][index] 
                                                ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                        onClick={() => handlePieClick(entry, index)}
                                    >
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                            <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            {formatCurrency(entry.value)}
                                        </p>
                                        <p className="text-sm font-semibold text-indigo-600 mt-1">
                                            {percentage}% מהעלויות
                                        </p>
                                        {selectedCostType === ['materials', 'labor', 'itemOverheads', 'projectVariables'][index] && (
                                            <p className="text-xs text-indigo-600 mt-1">לחץ להסתרת פירוט</p>
                                        )}
                                        {selectedCostType !== ['materials', 'labor', 'itemOverheads', 'projectVariables'][index] && (
                                            <p className="text-xs text-gray-500 mt-1">לחץ לפירוט</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Breakdown - Separate Card */}
                {selectedCostType && getSelectedBreakdown().length > 0 && (
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">
                                    פירוט מפורט: {costBreakdownData.find((_, index) => 
                                        ['materials', 'labor', 'itemOverheads', 'projectVariables'][index] === selectedCostType
                                    )?.name}
                                </CardTitle>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedCostType(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕ סגור
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getSelectedBreakdown().map((item, index) => (
                                    <div key={index} className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-700">סה״כ:</span>
                                    <span className="text-xl font-bold text-indigo-600">
                                        {formatCurrency(getSelectedBreakdown().reduce((sum, item) => sum + item.value, 0))}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Revenue Breakdown Chart */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>פילוח הכנסות לפי סוג</CardTitle>
                                <CardDescription>התפלגות ההכנסות בפרויקטים לפי קטגוריות</CardDescription>
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-bold text-gray-800">
                                    {formatCurrency(totalRevenueChart)}
                                </div>
                                <div className="text-sm text-gray-500">סה״כ הכנסות</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {revenueBreakdownData.length > 0 ? (
                            <>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie
                                                data={revenueBreakdownData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={110}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {revenueBreakdownData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value, name) => [
                                                    formatCurrency(value),
                                                    name
                                                ]}
                                                contentStyle={{ 
                                                    backgroundColor: '#ffffff', 
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                            />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {revenueBreakdownData.map((entry) => {
                                        const percentage = totalRevenueChart > 0 ? ((entry.value / totalRevenueChart) * 100).toFixed(1) : 0;
                                        return (
                                            <div 
                                                key={entry.name} 
                                                className="text-center p-4 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                    <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                                                </div>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(entry.value)}
                                                </p>
                                                <p className="text-sm font-semibold text-green-600 mt-1">
                                                    {percentage}% מההכנסות
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-4">
                                    <DollarSign className="h-12 w-12 mx-auto" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">אין נתוני הכנסות</h3>
                                <p className="text-sm text-gray-500">
                                    לא נמצאו נתוני הכנסות מפורטים עדיין.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Profit Breakdown Chart */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>פילוח רווח לפי סוג</CardTitle>
                                <CardDescription>התפלגות הרווח בפרויקטים לפי קטגוריות</CardDescription>
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-bold text-gray-800">
                                    {formatCurrency(profitBreakdownData.total)}
                                </div>
                                <div className="text-sm text-gray-500">סה״כ רווח</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {profitBreakdownData.data.length > 0 ? (
                            <>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie
                                                data={profitBreakdownData.data}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={110}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {profitBreakdownData.data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value, name) => [
                                                    formatCurrency(value),
                                                    name
                                                ]}
                                                contentStyle={{ 
                                                    backgroundColor: '#ffffff', 
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                            />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {profitBreakdownData.data.map((entry) => {
                                        const percentage = profitBreakdownData.total > 0 ? ((entry.value / profitBreakdownData.total) * 100).toFixed(1) : 0;
                                        return (
                                            <div 
                                                key={entry.name} 
                                                className="text-center p-4 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                    <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                                                </div>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(entry.value)}
                                                </p>
                                                <p className="text-sm font-semibold text-blue-600 mt-1">
                                                    {percentage}% מהרווח
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-4">
                                    <TrendingUp className="h-12 w-12 mx-auto" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">אין נתוני רווח מפורטים</h3>
                                <p className="text-sm text-gray-500">
                                    לא נמצאו נתוני רווח מפורטים עבור הסינון הנוכחי.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-indigo-600" />
                            מגמת רווחיות לפי פרויקט
                        </CardTitle>
                        <CardDescription>השוואת הכנסות, עלויות ורווח בעסקאות האחרונות</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <RechartsBarChart 
                                data={barChartData} 
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                onClick={handleBarClick}
                                style={{ cursor: 'pointer' }}
                            >
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.4}/>
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.4}/>
                                    </linearGradient>
                                     <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.6}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 12 }} 
                                />
                                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 12, fill: '#64748b' }} width={50} axisLine={false} tickLine={false} />
                                <RechartsTooltip 
                                    content={<CustomTooltip />}
                                    cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }}
                                />
                                <Legend content={renderCustomLegend} />
                                <Bar dataKey="הכנסות" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} maxBarSize={40} background={{ fill: '#f1f5f9', radius: [8, 8, 0, 0] }} />
                                <Bar dataKey="עלויות" fill="url(#colorCost)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="רווח" fill="url(#colorProfit)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

             {/* Chart Modal */}
            <Dialog open={!!activeChart} onOpenChange={() => setActiveChart(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-2xl font-bold text-gray-800">{getChartTitle()}</DialogTitle>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setActiveChart(null)}
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="h-[500px] p-4">
                        {activeChart === 'costs' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={90} outerRadius={140} fill="#8884d8" paddingAngle={5} dataKey="value" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        
                                        if (percent * 100 > 5) {
                                            return (
                                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                                                    {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}>
                                        {costBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        )}
                        {activeChart === 'revenue' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={revenueByProjectData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="הכנסה" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                        {activeChart === 'profit' && (
                             <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={profitByProjectData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="רווח" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    </div>
    );
}
