import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Quote } from '@/api/entities';
import { FinancialTransaction } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  ShieldOff,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  UserX,
  UserCheck,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminUserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userQuotes, setUserQuotes] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // בדיקת הרשאות מנהל
        const admin = await User.me();
        setCurrentUser(admin);
        if (admin.role !== 'admin') {
          navigate(createPageUrl('Dashboard'));
          return;
        }

        // שליפת ID המשתמש מה-URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        
        if (!userId) {
          setError('לא צוין מזהה משתמש');
          return;
        }

        // שליפת פרטי המשתמש
        const userData = await User.get ? await User.get(userId) : null;
        if (!userData) {
          setError('משתמש לא נמצא');
          return;
        }
        setUser(userData);

        // שליפת הצעות המחיר של המשתמש
        const quotes = await Quote.filter({ created_by: userData.email }, '-created_date');
        setUserQuotes(quotes);

        // שליפת עסקאות פיננסיות של המשתמש (באמצעות הצעות המחיר שלו)
        const quoteIds = quotes.map(q => q.id);
        if (quoteIds.length > 0) {
          // נחפש עסקאות עבור הצעות המחיר של המשתמש
          const transactions = await FinancialTransaction.list('-closingDate');
          const userTransactionsFiltered = transactions.filter(t => 
            quoteIds.includes(t.quoteId)
          );
          setUserTransactions(userTransactionsFiltered);
        }

      } catch (err) {
        console.error('שגיאה בטעינת פרופיל המשתמש:', err);
        setError('שגיאה בטעינת נתוני המשתמש');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleToggleUserStatus = async () => {
    if (!user || (currentUser && user.id === currentUser.id)) {
      alert('לא ניתן לשנות את הסטטוס של החשבון שלך');
      return;
    }

    setUpdating(true);
    try {
      const newStatus = !user.isActive;
      await User.update(user.id, { isActive: newStatus });
      setUser({ ...user, isActive: newStatus });
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס המשתמש:', error);
      alert('אירעה שגיאה בעדכון סטטוס המשתמש');
    } finally {
      setUpdating(false);
    }
  };

  const calculateUserStats = () => {
    const totalQuotes = userQuotes.length;
    const quotesByStatus = {
      draft: userQuotes.filter(q => q.status === 'טיוטה').length,
      sent: userQuotes.filter(q => q.status === 'נשלח').length,
      approved: userQuotes.filter(q => q.status === 'אושר').length,
      rejected: userQuotes.filter(q => q.status === 'נדחה').length,
      cancelled: userQuotes.filter(q => q.status === 'בוטל').length
    };

    const totalRevenue = userTransactions.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const totalProfit = userTransactions.reduce((sum, t) => sum + (t.estimatedProfit || 0), 0);
    
    const sentQuotes = quotesByStatus.sent + quotesByStatus.approved + quotesByStatus.rejected;
    const approvalRate = sentQuotes > 0 ? (quotesByStatus.approved / sentQuotes) * 100 : 0;

    return {
      totalQuotes,
      quotesByStatus,
      totalRevenue,
      totalProfit,
      approvalRate,
      totalTransactions: userTransactions.length
    };
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">טוען פרופיל משתמש...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-600">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">שגיאה</h2>
        <p>{error || 'לא ניתן לטעון את פרופיל המשתמש'}</p>
        <Button 
          onClick={() => navigate(createPageUrl('AdminUsers'))} 
          className="mt-4"
          variant="outline"
        >
          חזור לרשימת המשתמשים
        </Button>
      </div>
    );
  }

  const stats = calculateUserStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('AdminUsers'))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">פרופיל משתמש: {user.full_name || user.email}</h1>
            <p className="text-gray-500">צפייה מפורטת בפעילות המשתמש במערכת</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(createPageUrl(`AdminUserEdit?id=${user.id}`))}
          >
            <Edit className="h-4 w-4 ml-2" />
            ערוך פרטים
          </Button>
          <Button 
            variant={user.isActive !== false ? "destructive" : "default"}
            onClick={handleToggleUserStatus}
            disabled={updating || (currentUser && user.id === currentUser.id)}
            className={user.isActive !== false ? '' : 'bg-green-600 hover:bg-green-700'}
          >
            {updating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></div>
            ) : user.isActive !== false ? (
              <UserX className="h-4 w-4 ml-2" />
            ) : (
              <UserCheck className="h-4 w-4 ml-2" />
            )}
            {user.isActive !== false ? 'השבת משתמש' : 'הפעל משתמש'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* פרטי המשתמש */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              פרטי המשתמש
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* תמונת פרופיל ושם */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.full_name || 'לא צוין'}</h3>
                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                  <div className="flex items-center gap-1">
                    {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                    {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                  </div>
                </Badge>
              </div>
            </div>

            <Separator />

            {/* פרטי קשר */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{user.email}</span>
              </div>
              
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  הצטרף ב-{format(new Date(user.created_date), 'dd/MM/yyyy', { locale: he })}
                </span>
              </div>

              {user.lastLoginDate && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    התחברות אחרונה: {format(new Date(user.lastLoginDate), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* סטטוס */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">סטטוס חשבון:</span>
              <Badge 
                variant={user.isActive !== false ? 'default' : 'secondary'}
                className={user.isActive !== false ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-600 hover:bg-red-100'}
              >
                {user.isActive !== false ? 'פעיל' : 'מושבת'}
              </Badge>
            </div>

            {/* הערות ניהוליות */}
            {user.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">הערות ניהוליות:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{user.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* סיכום פעילות */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              סיכום פעילות במערכת
            </CardTitle>
            <CardDescription>
              נתוני הפעילות של המשתמש במערכת
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* כרטיסי סיכום */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">הצעות מחיר</span>
                </div>
                <div className="text-2xl font-bold text-blue-800">{stats.totalQuotes}</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">הצעות מאושרות</span>
                </div>
                <div className="text-2xl font-bold text-green-800">{stats.quotesByStatus.approved}</div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">סה"כ הכנסות</span>
                </div>
                <div className="text-xl font-bold text-purple-800">
                  {stats.totalRevenue.toLocaleString()} ₪
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">אחוז אישור</span>
                </div>
                <div className="text-2xl font-bold text-orange-800">
                  {stats.approvalRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* פילוח הצעות לפי סטטוס */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">פילוח הצעות מחיר לפי סטטוס</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">טיוטות: {stats.quotesByStatus.draft}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Send className="w-3 h-3 text-blue-500" />
                  <span className="text-sm">נשלחו: {stats.quotesByStatus.sent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-sm">אושרו: {stats.quotesByStatus.approved}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span className="text-sm">נדחו: {stats.quotesByStatus.rejected}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span className="text-sm">בוטלו: {stats.quotesByStatus.cancelled}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* הצעות מחיר אחרונות */}
      {userQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>הצעות מחיר אחרונות</CardTitle>
            <CardDescription>10 הצעות המחיר האחרונות שנוצרו על ידי המשתמש</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userQuotes.slice(0, 10).map(quote => (
                <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{quote.projectName}</h4>
                    <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                      <span>לקוח: {quote.clientName}</span>
                      <span>תאריך: {format(new Date(quote.created_date), 'dd/MM/yyyy', { locale: he })}</span>
                      <span>סכום: {quote.finalAmount?.toLocaleString()} ₪</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      quote.status === 'אושר' ? 'bg-green-100 text-green-800' :
                      quote.status === 'נדחה' ? 'bg-red-100 text-red-800' :
                      quote.status === 'נשלח' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'בוטל' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {quote.status || 'טיוטה'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(createPageUrl(`QuoteView?id=${quote.id}`))}
                    >
                      צפייה
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* אם אין פעילות */}
      {stats.totalQuotes === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין פעילות עדיין</h3>
            <p className="text-gray-500">המשתמש עדיין לא יצר הצעות מחיר במערכת.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}