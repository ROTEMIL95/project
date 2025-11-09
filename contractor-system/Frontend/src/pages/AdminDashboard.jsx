
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/lib/entities';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { useUser } from '@/components/utils/UserContext';
import { Users, LayoutGrid, Settings, BarChart2, MessageSquare } from 'lucide-react';

const adminActions = [
  {
    title: "ניהול משתמשים",
    description: "צפייה וניהול של כל המשתמשים במערכת",
    icon: <Users className="w-8 h-8 text-blue-500" />,
    path: "AdminUsers",
    color: "blue"
  },
  {
    title: "ניהול פניות לקוחות",
    description: "צפייה וטיפול בפניות שהתקבלו מלקוחות",
    icon: <MessageSquare className="w-8 h-8 text-orange-500" />,
    path: "AdminCustomerInquiries",
    color: "orange"
  },
  {
    title: "ניהול קטגוריות",
    description: "הוספה, עריכה ומחיקה של קטגוריות עבודה",
    icon: <LayoutGrid className="w-8 h-8 text-green-500" />,
    path: "AdminCategories",
    color: "green"
  },
  {
    title: "הגדרות מערכת",
    description: "קביעת פרמטרים והגדרות כלליות",
    icon: <Settings className="w-8 h-8 text-slate-500" />,
    path: "Settings",
    color: "slate"
  },
  {
    title: "דוחות וניתוחים",
    description: "צפייה בנתוני שימוש ודוחות מתקדמים",
    icon: <BarChart2 className="w-8 h-8 text-purple-500" />,
    path: "Reports",
    color: "purple"
  }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      navigate(createPageUrl('Login'));
      return;
    }

    if (user.role !== 'admin') {
      navigate(createPageUrl('Dashboard'));
    }
  }, [user, userLoading, navigate]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">דשבורד ניהול</h1>
        <p className="mt-2 text-lg text-gray-600">ניהול מרכזי של כל רכיבי המערכת.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminActions.map((action) => (
          <Card 
            key={action.title}
            className="hover:shadow-lg hover:border-indigo-500 transition-all cursor-pointer"
            onClick={() => navigate(createPageUrl(action.path))}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className={`bg-${action.color}-100 p-4 rounded-lg`}>
                {action.icon}
              </div>
              <div>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
