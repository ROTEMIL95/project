
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { QuoteTemplate } from '@/lib/entities';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Search,
  Copy,
  Edit,
  Trash2,
  FileText,
  Filter,
  Upload
} from 'lucide-react';

export default function QuoteTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // בהמשך נחליף בנתונים אמיתיים מקבצי האקסל
      setTimeout(() => {
        const mockTemplates = [
          {
            id: "t1",
            name: "שיפוץ חדר אמבטיה סטנדרטי",
            description: "תבנית לשיפוץ חדר אמבטיה בסיסי כולל החלפת כלים סניטריים וריצוף",
            category: "חדר אמבטיה",
            projectType: "דירה",
            isActive: true,
            version: "1.0",
            lastUpdated: "2024-01-15",
            itemsCount: 12
          },
          {
            id: "t2",
            name: "שיפוץ מטבח מלא",
            description: "תבנית לשיפוץ מטבח כולל החלפת ארונות, שיש וריצוף",
            category: "מטבח",
            projectType: "דירה",
            isActive: true,
            version: "1.1",
            lastUpdated: "2024-01-16",
            itemsCount: 15
          }
        ];
        setTemplates(mockTemplates);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error loading templates:", error);
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    navigate(createPageUrl('QuoteTemplateEdit'));
  };

  const handleEditTemplate = (templateId) => {
    navigate(createPageUrl(`QuoteTemplateEdit?id=${templateId}`));
  };

  const handleDuplicateTemplate = (templateId) => {
    // יושלם בהמשך
    console.log("Duplicating template:", templateId);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תבניות הצעות מחיר</h1>
          <p className="mt-1 text-gray-500">ניהול תבניות מוכנות להצעות מחיר</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(createPageUrl('ImportTemplates'))}>
            <Upload className="h-4 w-4 ml-2" />
            ייבוא מאקסל
          </Button>
          <Button onClick={handleCreateTemplate}>
            <PlusCircle className="h-4 w-4 ml-2" />
            תבנית חדשה
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="חיפוש תבניות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-48">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              <SelectItem value="חדר אמבטיה">חדר אמבטיה</SelectItem>
              <SelectItem value="מטבח">מטבח</SelectItem>
              <SelectItem value="דירה מלאה">דירה מלאה</SelectItem>
              <SelectItem value="משרד">משרד</SelectItem>
              <SelectItem value="חדר שינה">חדר שינה</SelectItem>
              <SelectItem value="סלון">סלון</SelectItem>
              <SelectItem value="אחר">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>תבניות זמינות</CardTitle>
          <CardDescription>
            לחץ על תבנית כדי לצפות בפרטים או לערוך אותה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם התבנית</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>סוג פרויקט</TableHead>
                <TableHead>מספר פריטים</TableHead>
                <TableHead>עודכן לאחרונה</TableHead>
                <TableHead>גרסה</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell onClick={() => handleEditTemplate(template.id)}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell>{template.projectType}</TableCell>
                  <TableCell>{template.itemsCount} פריטים</TableCell>
                  <TableCell>
                    {new Date(template.lastUpdated).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">v{template.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicateTemplate(template.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
