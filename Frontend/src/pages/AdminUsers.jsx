
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { useUser } from '@/components/utils/UserContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye, 
  UserX, 
  UserCheck, 
  Search,
  Phone,
  Mail,
  Shield,
  ShieldOff
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: currentUser, loading: userLoading } = useUser();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (userLoading) return;

      if (!currentUser) {
        navigate(createPageUrl('Login'));
        return;
      }

      if (currentUser.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      try {
        const userList = await User.list('-created_date');
        setUsers(userList);
        setFilteredUsers(userList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser, userLoading, navigate]);

  // חיפוש וסינון משתמשים
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleToggleUserStatus = async (user) => {
    if (currentUser && user.id === currentUser.id) {
      alert('לא ניתן לשנות את הסטטוס של החשבון שלך');
      return;
    }

    setUpdating(user.id);
    try {
      const newStatus = !user.isActive;
      
      // וידוי שהשדה isActive מוגדר נכון
      const updateData = { 
        isActive: newStatus === true ? true : false // וידוי מפורש
      };
      
      console.log('Updating user:', user.id, 'with data:', updateData);
      
      await User.update(user.id, updateData);
      
      // עדכון הרשימה המקומית
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, isActive: newStatus } : u
      );
      setUsers(updatedUsers);
      
      // עדכון הרשימה המסוננת
      const filteredUpdate = updatedUsers.filter(u => 
        !searchQuery.trim() || 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
      );
      setFilteredUsers(filteredUpdate);
      
      // הודעת אישור
      const statusText = newStatus ? 'הופעל' : 'הושבת';
      alert(`המשתמש ${user.full_name || user.email} ${statusText} בהצלחה`);
      
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס המשתמש:', error);
      alert('אירעה שגיאה בעדכון סטטוס המשתמש: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (currentUser && userToDelete.id === currentUser.id) {
      alert('לא ניתן למחוק את החשבון שלך');
      return;
    }

    setDeleting(userToDelete.id);
    try {
      await User.delete(userToDelete.id);
      const updatedUsers = users.filter(user => user.id !== userToDelete.id);
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers.filter(u => 
        !searchQuery.trim() || 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
      ));
      alert('המשתמש נמחק בהצלחה');
    } catch (error) {
      console.error('שגיאה במחיקת המשתמש:', error);
      alert('אירעה שגיאה במחיקת המשתמש: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setDeleting(null);
    }
  };

  const handleViewUserProfile = (userId) => {
    navigate(createPageUrl(`AdminUserProfile?id=${userId}`));
  };

  const handleEditUser = (userId) => {
    navigate(createPageUrl(`AdminUserEdit?id=${userId}`));
  };

  const handleInviteUser = () => {
    // זה יפתח את פאנל ההזמנות של הפלטפורמה
    alert('פונקציית הזמנת משתמשים תיפתח בקרוב. כרגע, ניתן להזמין משתמשים דרך הגדרות הפלטפורמה.');
    // בעתיד נוכל להוסיף כאן ניווט לעמוד הזמנות או דיאלוג מותאם
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">טוען משתמשים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('AdminDashboard'))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ניהול משתמשים</h1>
            <p className="text-gray-500">צפייה במשתמשי המערכת וניהול הרשאות.</p>
          </div>
        </div>
        <Button onClick={handleInviteUser}>
          <UserPlus className="h-4 w-4 ml-2" />
          הזמן משתמש חדש
        </Button>
      </div>

      {/* חיפוש */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>רשימת משתמשים</span>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>סה"כ: {users.length}</span>
              <span>פעילים: {users.filter(u => u.isActive !== false).length}</span>
              <span>מושבתים: {users.filter(u => u.isActive === false).length}</span>
            </div>
          </CardTitle>
          <CardDescription>
            {searchQuery ? `נמצאו ${filteredUsers.length} תוצאות` : `סה"כ ${users.length} משתמשים רשומים במערכת.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם מלא</TableHead>
                <TableHead>פרטי קשר</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תאריך הצטרפות</TableHead>
                <TableHead className="text-center">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id} className={user.isActive === false ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-medium">{user.full_name || 'לא צוין'}</div>
                        {user.isActive === false && (
                          <div className="text-xs text-red-600 font-medium">משתמש מושבת</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      <div className="flex items-center gap-1">
                        {user.role === 'admin' ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <ShieldOff className="h-3 w-3" />
                        )}
                        {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.isActive !== false ? 'default' : 'secondary'}
                      className={user.isActive !== false ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-600 hover:bg-red-100'}
                    >
                      {user.isActive !== false ? 'פעיל' : 'מושבת'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(user.created_date).toLocaleDateString('he-IL')}
                    </div>
                    {user.lastLoginDate && (
                      <div className="text-xs text-gray-500">
                        התחברות אחרונה: {new Date(user.lastLoginDate).toLocaleDateString('he-IL')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      {/* צפייה בפרופיל */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleViewUserProfile(user.id)}
                        title="צפייה בפרופיל מלא"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {/* עריכה */}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditUser(user.id)}
                        title="עריכת פרטי משתמש"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {/* השבתה/הפעלה */}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleUserStatus(user)}
                        disabled={updating === user.id || (currentUser && user.id === currentUser.id)}
                        title={user.isActive !== false ? 'השבת משתמש' : 'הפעל משתמש'}
                        className={user.isActive !== false ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                      >
                        {updating === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : user.isActive !== false ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* מחיקה */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleting === user.id || (currentUser && user.id === currentUser.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                            <AlertDialogDescription>
                              פעולה זו תמחק לצמיתות את המשתמש <strong>{user.full_name}</strong> ({user.email}) מהמערכת.
                              <br />
                              <br />
                              <span className="text-amber-600 font-medium">
                                ⚠️ שים לב: הנתונים שהמשתמש יצר (הצעות מחיר, מחירונים וכו') יישארו במערכת.
                              </span>
                              <br />
                              <br />
                              פעולה זו לא ניתנת לביטול.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              כן, מחק משתמש
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'לא נמצאו משתמשים התואמים לחיפוש.' : 'אין משתמשים במערכת.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
