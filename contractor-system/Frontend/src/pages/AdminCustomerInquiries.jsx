import React, { useState, useEffect, useCallback } from 'react';
import { CustomerInquiry } from '@/lib/entities';
import { User } from '@/lib/entities';
import { useUser } from '@/components/utils/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2, Edit, MessageSquare, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminCustomerInquiries() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CustomerInquiry.list('-created_date');
      setInquiries(data);
    } catch (error) {
      console.error("Failed to load inquiries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      navigate(createPageUrl('Login'));
      return;
    }

    if (user.role !== 'admin') {
      navigate(createPageUrl('Dashboard'));
      return;
    }

    loadInquiries();
  }, [user, userLoading, loadInquiries, navigate]);

  const handleOpenDialog = (inquiry) => {
    setSelectedInquiry(inquiry);
    setStatusToUpdate(inquiry.status);
    setAdminNotes(inquiry.adminNotes || '');
    setIsDialogOpen(true);
  };

  const handleUpdateInquiry = async () => {
    if (!selectedInquiry) return;
    try {
      await CustomerInquiry.update(selectedInquiry.id, {
        status: statusToUpdate,
        adminNotes: adminNotes,
      });
      setIsDialogOpen(false);
      setSelectedInquiry(null);
      loadInquiries(); // Refresh the list
    } catch (error) {
      console.error("Failed to update inquiry:", error);
    }
  };
  
  const handleDeleteInquiry = async (inquiryId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הפנייה הזו? לא ניתן לשחזר את הפעולה.')) {
        try {
            await CustomerInquiry.delete(inquiryId);
            loadInquiries();
        } catch (error) {
            console.error("Failed to delete inquiry:", error);
        }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'חדש':
        return 'bg-blue-100 text-blue-800';
      case 'בטיפול':
        return 'bg-yellow-100 text-yellow-800';
      case 'נסגר':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">ניהול פניות לקוחות</h1>
          <p className="text-gray-600">כאן תוכל לראות ולנהל את כל הפניות שהגיעו מהלקוחות.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(createPageUrl('AdminDashboard'))}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          חזור לדשבורד
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            רשימת פניות לקוחות
          </CardTitle>
          <CardDescription>
            {inquiries.length === 0 ? 'לא נמצאו פניות.' : `נמצאו ${inquiries.length} פניות.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inquiries.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">עדיין לא התקבלו פניות מלקוחות.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>שם</TableHead>
                  <TableHead>נושא</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell>{format(new Date(inquiry.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{inquiry.name}</TableCell>
                    <TableCell>{inquiry.subject}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(inquiry.status)}>{inquiry.status}</Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(inquiry)}>
                        <Edit className="h-4 w-4 mr-2" />
                        נהל פנייה
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteInquiry(inquiry.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          מחק
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {selectedInquiry && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>פרטי פנייה: {selectedInquiry.subject}</DialogTitle>
              <DialogDescription>
                מאת: {selectedInquiry.name} ({selectedInquiry.email}) | טלפון: {selectedInquiry.phone || 'לא נמסר'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold mb-2">תוכן ההודעה:</h4>
                <p className="p-4 bg-gray-50 rounded-md border text-gray-700 whitespace-pre-wrap">{selectedInquiry.message}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="status" className="font-semibold">סטטוס פנייה:</label>
                    <Select value={statusToUpdate} onValueChange={setStatusToUpdate}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="בחר סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="חדש">חדש</SelectItem>
                        <SelectItem value="בטיפול">בטיפול</SelectItem>
                        <SelectItem value="נסגר">נסגר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="adminNotes" className="font-semibold">הערות פנימיות:</label>
                <Textarea 
                    id="adminNotes"
                    placeholder="הערות לשימוש פנימי בלבד..." 
                    value={adminNotes} 
                    onChange={(e) => setAdminNotes(e.target.value)} 
                    rows={4}
                />
              </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
                <Button onClick={handleUpdateInquiry}>שמור שינויים</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}