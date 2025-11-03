import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUser } from '@/components/utils/UserContext';
import { supabase } from '@/lib/supabase';
import { 
  Home, 
  Menu, 
  X,
  ShoppingCart, 
  FileText, 
  Hammer, 
  BarChart3, 
  Settings, 
  LogOut,
  HelpCircle,
  User as UserIcon,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const { user } = useUser();
  const [showSidebar, setShowSidebar] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(createPageUrl('Login'));
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const menuItems = [
    { name: 'דשבורד', icon: <Home className="h-5 w-5" />, path: 'Dashboard' },
    { name: 'קטלוג מוצרים', icon: <ShoppingCart className="h-5 w-5" />, path: 'Catalog' },
    { name: 'הצעות מחיר', icon: <FileText className="h-5 w-5" />, path: 'QuotesList' },
    { name: 'תבניות הצעות מחיר', icon: <Copy className="h-5 w-5" />, path: 'QuoteTemplates' },
    { name: 'פרויקטים', icon: <Hammer className="h-5 w-5" />, path: 'Projects' },
    { name: 'דוחות', icon: <BarChart3 className="h-5 w-5" />, path: 'Reports' },
    { name: 'הגדרות', icon: <Settings className="h-5 w-5" />, path: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden mr-2">
            {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center cursor-pointer" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <div className="text-xl font-bold text-indigo-600 tracking-tight">לחשב חכם</div>
          </div>
        </div>
        
        {user && (
          <div className="flex items-center">
            <span className="hidden md:inline-block text-sm text-gray-700 ml-3">{user.full_name}</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 ml-2">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5" />}
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 lg:relative lg:top-0 bg-white border-l border-gray-200 w-64 transition-transform ease-in-out duration-300 z-30 lg:translate-x-0 overflow-y-auto flex flex-col justify-between`}>
          <div className="px-3 py-4">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <div
                  key={item.name}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                    currentPageName === item.path
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => navigate(createPageUrl(item.path))}
                >
                  <span className="ml-3">{item.icon}</span>
                  <span className="mx-4">{item.name}</span>
                </div>
              ))}
            </nav>
          </div>
          
          <div className="px-3 py-4 border-t border-gray-200">
            <div className="space-y-1">
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50">
                <HelpCircle className="h-5 w-5 ml-3" />
                <span>עזרה ותמיכה</span>
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
              >
                <LogOut className="h-5 w-5 ml-3" />
                <span>התנתק</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-4 lg:p-8 ${showSidebar ? 'lg:mr-64' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}