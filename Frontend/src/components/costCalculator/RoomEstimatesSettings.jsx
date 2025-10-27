
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, X } from 'lucide-react';
import { User } from '@/api/entities';

export default function RoomEstimatesSettings({ isOpen, onClose, onSave }) {
  const [roomEstimates, setRoomEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRoomEstimates();
    }
  }, [isOpen]);

  const loadRoomEstimates = async () => {
    try {
      setLoading(true);
      const userData = await User.me();
      setRoomEstimates(userData.roomEstimates || []);
    } catch (error) {
      console.error('שגיאה בטעינת נתוני החללים:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewRoom = () => {
    const newRoom = {
      id: `room_${Date.now()}`,
      roomType: '',
      wallAreaSqM: 0,
      ceilingAreaSqM: 0, 
      openingsReduction: {
        few: 5,
        regular: 10,
        many: 15
      }
    };
    setRoomEstimates([...roomEstimates, newRoom]);
  };

  const handleDeleteRoom = (roomId) => {
    setRoomEstimates(roomEstimates.filter(room => room.id !== roomId));
  };

  const handleRoomChange = (roomId, field, value) => {
    setRoomEstimates(roomEstimates.map(room => {
      if (room.id === roomId) {
        if (field.includes('.')) {
          // Handle nested fields like 'openingsReduction.few'
          const [parentField, childField] = field.split('.');
          return {
            ...room,
            [parentField]: {
              ...room[parentField],
              [childField]: Number(value) || 0
            }
          };
        } else {
          return {
            ...room,
            [field]: field === 'roomType' ? value : (Number(value) || 0)
          };
        }
      }
      return room;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate data
      const validEstimates = roomEstimates.filter(room => 
        room.roomType && room.roomType.trim() !== ''
      );

      if (validEstimates.length === 0) {
        alert('נא להוסיף לפחות חלל אחד עם שם תקין');
        return;
      }

      await User.updateMyUserData({ roomEstimates: validEstimates });
      onSave(validEstimates);
      onClose();
    } catch (error) {
      console.error('שגיאה בשמירת נתוני החללים:', error);
      alert('שגיאה בשמירת הנתונים');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">הגדרות אומדן חללים</DialogTitle>
          <DialogDescription>
            נהל את טבלת האומדנים של סוגי החללים שלך. נתונים אלה ישמשו לחישוב מהיר של כמויות בהצעות מחיר.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="mr-2">טוען נתונים...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">טבלת סוגי חללים</h3>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center font-bold w-20">פעולות</TableHead>
                    <TableHead className="text-center font-bold w-24">הרבה פתחים (%)</TableHead>
                    <TableHead className="text-center font-bold w-24">רגיל פתחים (%)</TableHead>
                    <TableHead className="text-center font-bold w-24">מעט פתחים (%)</TableHead>
                    <TableHead className="text-center font-bold w-32">שטח תקרה (מ"ר)</TableHead>
                    <TableHead className="text-center font-bold w-32">שטח קירות (מ"ר)</TableHead>
                    <TableHead className="font-bold">סוג החלל</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomEstimates.map(room => (
                    <TableRow key={room.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={room.openingsReduction?.many || 15}
                          onChange={(e) => handleRoomChange(room.id, 'openingsReduction.many', e.target.value)}
                          className="text-center"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={room.openingsReduction?.regular || 10}
                          onChange={(e) => handleRoomChange(room.id, 'openingsReduction.regular', e.target.value)}
                          className="text-center"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={room.openingsReduction?.few || 5}
                          onChange={(e) => handleRoomChange(room.id, 'openingsReduction.few', e.target.value)}
                          className="text-center"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={room.ceilingAreaSqM || 0}
                          onChange={(e) => handleRoomChange(room.id, 'ceilingAreaSqM', e.target.value)}
                          className="text-center"
                          min="0"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={room.wallAreaSqM || 0}
                          onChange={(e) => handleRoomChange(room.id, 'wallAreaSqM', e.target.value)}
                          className="text-center"
                          min="0"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={room.roomType || ''}
                          onChange={(e) => handleRoomChange(room.id, 'roomType', e.target.value)}
                          placeholder="לדוגמה: חדר שינה קטן"
                          className="font-medium"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <Button onClick={handleAddNewRoom} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 ml-2" />
                הוסף חלל חדש
              </Button>
            </div>

            {roomEstimates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>לא הוגדרו חללים עדיין.</p>
                <p className="text-sm">לחץ על "הוסף חלל חדש" כדי להתחיל.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="w-4 h-4 ml-2" />
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור הגדרות
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
