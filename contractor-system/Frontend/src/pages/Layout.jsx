

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/lib/entities';
import { UserProvider, useUser } from '@/components/utils/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home, Menu, X, LogOut, HelpCircle, User as UserIcon, Shield,
  LayoutDashboard, FilePlus2, Briefcase, Calculator, Send, DollarSign, Contact, Coins, Settings2, Settings, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster";

const PageLayout = ({ children, currentPageName }) => {
  const { user, loading: isCheckingStatus, error: userError, isOnline, refresh } = useUser();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Changed: default state is now false
  const navigate = useNavigate();
  const location = useLocation(); // NEW: track route for transitions

  const handleLogout = async () => {
    console.log('[Layout] 🚪 Starting logout process...');

    // STEP 1: Clear local storage FIRST (before anything else)
    // This prevents userStore from reloading cached data
    console.log('[Layout] 📦 Clearing local storage...');
    localStorage.clear();
    sessionStorage.clear();

    try {
      // STEP 2: Sign out from Supabase
      console.log('[Layout] 🔐 Signing out from Supabase...');
      const { error } = await signOut();

      if (error) {
        console.error('[Layout] ⚠️ Logout error:', error);
        // Don't throw - continue with redirect even if signOut fails
      } else {
        console.log('[Layout] ✅ Signed out successfully');
      }
    } catch (error) {
      console.error('[Layout] ❌ Failed to sign out:', error);
      // Continue with redirect anyway
    }

    // STEP 3: Force immediate redirect with full page reload
    // This ensures all React state and Zustand store are cleared
    console.log('[Layout] 🔄 Redirecting to login...');
    window.location.href = '/login';
  };

  if (isCheckingStatus) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען נתוני משתמש...</p>
        </div>
      </div>
    );
  }

  // NEW: Offline-friendly screen only when no cached user is available
  const isNetworkError =
    !!userError && String(userError.message || '').toLowerCase().includes('network');

  if (!user && (!isOnline || isNetworkError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-orange-50">
        <div className="text-center max-w-md">
          <div className="text-orange-600 text-2xl font-bold mb-2">אין חיבור לרשת</div>
          <p className="text-orange-700 mb-4">נראה שיש בעיית תקשורת. נסה לרענן את החיבור.</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={refresh} className="bg-orange-600 hover:bg-orange-700 text-white">
              נסה שוב
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              רענן עמוד
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-xl font-bold mb-4">נדרשת התחברות</div>
          <p className="text-red-500">נראה שאינך מחובר למערכת.</p>
           <Button onClick={() => User.login()} className="mt-4">
            התחבר
          </Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: 'דשבורד', icon: <LayoutDashboard className="h-5 w-5" />, path: 'Dashboard', color: 'indigo' },
    { name: 'הצעת מחיר חדשה', icon: <FilePlus2 className="h-5 w-5" />, path: 'QuoteCreate', color: 'blue' },
    { name: 'הזנת נתונים', icon: <Calculator className="h-5 w-5" />, path: 'CostCalculator', color: 'green' },
    { name: 'מחירון קבלן', icon: <Settings2 className="h-5 w-5" />, path: 'ContractorPricing', color: 'teal' },
    { name: 'הצעות שנשלחו', icon: <Send className="h-5 w-5" />, path: 'SentQuotes', color: 'sky' },
    { name: 'פרטי קבלן', icon: <Contact className="h-5 w-5" />, path: 'ContractAgreement', color: 'pink' },
    { name: 'ניהול פרויקטים', icon: <Briefcase className="h-5 w-5" />, path: 'ProjectManagement', color: 'purple', disabled: true, badge: 'בקרוב!' },
    { name: 'הזמנת חומרים', icon: <Package className="h-5 w-5" />, path: 'MaterialOrdering', color: 'orange', disabled: true, badge: 'בקרוב!' },
    { name: 'ניהול פיננסי', icon: <Coins className="h-5 w-5" />, path: 'Finance', color: 'amber', disabled: true, badge: 'בקרוב!' }
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <style>{`
        @keyframes shimmer-animation {
          0% { transform: translateX(-150%) skewX(-30deg); }
          100% { transform: translateX(150%) skewX(-30deg); }
        }
        .shimmer-element { position: relative; overflow: hidden; }
        .shimmer-element::after {
          content: ''; position: absolute; top: 0; left: 0;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0));
          transform: translateX(-150%) skewX(-30deg);
          opacity: 0; transition: none; z-index: 1;
        }
        .shimmer-element:hover::after {
          opacity: 1; animation: shimmer-animation 0.8s ease-in-out; transition: opacity 0.2s;
        }
        /* NEW: smooth page enter animation */
        @keyframes page-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-fade-enter { animation: page-fade-in 180ms ease-out; }
      `}</style>
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 h-14 sm:h-16 flex items-center px-3 sm:px-4 lg:px-8 fixed w-full top-0 z-[100]">
        {/* Menu button - always visible */}
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="mr-1 sm:mr-2 h-9 w-9 sm:h-10 sm:w-10 shrink-0">
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Logo - centered on mobile, hidden on tablet, visible on large desktop */}
        <div
          className="flex-1 md:hidden lg:flex lg:flex-initial justify-center lg:justify-start overflow-hidden items-center cursor-pointer shimmer-element p-1.5 sm:p-2 rounded-lg"
          onClick={() => navigate(createPageUrl('Dashboard'))}
        >
          <div className="text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">לחשב חכם</div>
        </div>
        
        {/* --- New Navigation Buttons for Desktop and Tablet (centered) --- */}
        <nav className="hidden md:flex items-center gap-3 flex-1 justify-center">
          <Button
            onClick={() => navigate(createPageUrl('ContractorPricing'))}
            variant="ghost"
            className="font-semibold text-gray-600 hover:bg-teal-50 hover:text-teal-700"
          >
            <Settings2 className="h-4 w-4 ml-2 text-teal-500" />
            מחירון קבלן
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Emphasized primary action in the center */}
          <Button
            onClick={() => navigate(createPageUrl('QuoteCreate'))}
            className="px-5 py-2.5 text-base rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600 shadow-sm"
          >
            <FilePlus2 className="w-5 h-5 ml-2" />
            הצעת מחיר חדשה
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('PricebookSettings'))} // Open PricebookSettings page
            className="font-semibold text-gray-600 hover:bg-purple-50 hover:text-purple-700"
          >
            <Settings className="h-4 w-4 ml-2 text-purple-500" />
            הגדרות מחירון
          </Button>
        </nav>
        {/* --- End of Navigation Buttons --- */}

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline-block text-xs sm:text-sm font-medium text-gray-700">{user.full_name}</span>
            <button
              onClick={() => navigate(createPageUrl('ContractAgreement'))}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-inner hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer text-sm sm:text-base"
              title="פרטי קבלן"
            >
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        )}
      </header>

      <div className="flex pt-14 sm:pt-16 w-full max-w-full overflow-x-hidden">
        <aside
          className={cn(
            'fixed top-0 right-0 h-screen w-[90%] sm:w-80 md:w-96 max-w-full bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col z-[110]',
            isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full' // Changed: visibility controlled by state
          )}
        >
          {/* Added: Close button and header for sidebar */}
          <div className="flex justify-between items-center p-3 sm:p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">לחשב חכם</div>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-sm sm:text-base font-semibold text-gray-600">תפריט</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="h-9 w-9">
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const isActive = currentPageName === item.path;
                const isDisabled = item.disabled;

                return (
                  <div
                    key={item.name}
                    className={cn(
                      "group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300",
                      isDisabled
                        ? "cursor-not-allowed opacity-50 bg-gray-50"
                        : "cursor-pointer transform hover:-translate-y-0.5 shimmer-element",
                      isActive && !isDisabled
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-500 text-white shadow-lg'
                        : !isDisabled && `text-gray-600 hover:bg-${item.color}-50 hover:text-${item.color}-700`
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        navigate(createPageUrl(item.path));
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <span className={cn(
                          "ml-2 sm:ml-4 transition-colors",
                          isActive && !isDisabled ? 'text-white' : isDisabled ? 'text-gray-400' : `text-${item.color}-500`
                      )}>{item.icon}</span>
                      <span className="text-xs sm:text-sm">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}
              
              {user && user.role === 'admin' && (
                <>
                  <Separator className="my-4 bg-gray-200/80" />
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">ניהול מערכת</div>
                  <div
                    className={cn("group flex items-center px-4 py-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 shimmer-element", currentPageName === 'AdminDashboard' ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg' : 'text-gray-600 hover:bg-slate-100 hover:text-slate-800')}
                    onClick={() => { navigate(createPageUrl('AdminDashboard')); setIsSidebarOpen(false); }}
                  >
                    <Shield className={cn("h-5 w-5 ml-4", currentPageName === 'AdminDashboard' ? 'text-white' : 'text-slate-500 group-hover:text-slate-600')} />
                    <span>דשבורד ניהול</span>
                  </div>
                </>
              )}
            </nav>
          </div>

          <div className="border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 space-y-2">
            <button onClick={() => {navigate(createPageUrl('Support')); setIsSidebarOpen(false);}} className="w-full flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 rounded-lg hover:bg-gray-100 transition-colors shimmer-element text-right">
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 ml-2 sm:ml-3 text-gray-500" />
              <span>עזרה ותמיכה</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors shimmer-element">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 ml-2 sm:ml-3 text-gray-500" />
              <span>התנתק</span>
            </button>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[105]" onClick={() => setIsSidebarOpen(false)} />}
        <main className="flex-1 p-3 sm:p-4 lg:p-8 min-h-screen w-full max-w-full overflow-x-hidden">
          {/* NEW: don't re-mount on query param change */}
          {/* CHANGED: allow wider content area */}
          <div key={location.pathname} className="w-full max-w-full lg:max-w-[1600px] mx-auto page-fade-enter overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
};

export default function Layout({ children, currentPageName }) {
  // Smooth scroll to top only on path change (not on query change)
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [useLocation().pathname]); // Changed: use useLocation().pathname directly

  if (currentPageName === 'QuotePrint' || currentPageName === 'ClientQuoteView') {
    return <>{children}</>;
  }

  return (
    <UserProvider>
      <PageLayout currentPageName={currentPageName}>
        {children}
      </PageLayout>
    </UserProvider>
  );
}

