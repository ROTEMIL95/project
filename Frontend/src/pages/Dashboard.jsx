
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useUser } from '@/components/utils/UserContext';
import { Calculator, FileText, Send, TrendingUp, ListChecks, ArrowLeft, Sparkles, Landmark, FileSignature, Plus, Briefcase, FilePlus2 } from 'lucide-react';
import RecentQuotes from '@/components/dashboard/RecentQuotes';
import RevenueChart from '@/components/dashboard/RevenueChart';
import MonthlyCashFlowChart from '@/components/dashboard/MonthlyCashFlowChart';
import { Loader2 } from 'lucide-react';

const subtitles = [
    "בלי נתונים אתה בונה על מזל – אצלנו אתה בונה על ודאות.",
    "כשהמספרים מפוזרים במחברות – הפרויקט מתפזר בשטח. אצלנו הכול מרוכז במסך אחד.",
    "בכל פרויקט יש רווח חבוי שאובד בין החישובים – אצלנו הוא יוצא לאור.",
    "הצעת מחיר היא לא רק סכום – היא מפת דרכים של כל הפרויקט.",
    "כשמהירות פוגשת דיוק – גם הלקוח שלך מרגיש ביטחון.",
    "הצעת מחיר שיוצאת בדקות – חוסכת לך ימים.",
    "אחרי שחווית עבודה מסודרת ושקופה – אי אפשר לחזור לכאוס של מחברות וטלפונים.",
    "כשהמערכת מראה לך לאן הכסף זורם – כל שאר הדרכים נראות כמו ניחוש."
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [greeting, setGreeting] = useState('');
  const [dynamicSubtitle, setDynamicSubtitle] = useState('');

  useEffect(() => {
    // Select a random subtitle on component mount
    const randomIndex = Math.floor(Math.random() * subtitles.length);
    setDynamicSubtitle(subtitles[randomIndex]);

    // Set greeting based on time of day
    const hour = new Date().getHours();
    let greetingText = '';
    if (hour >= 5 && hour < 11) {
      greetingText = 'בוקר טוב';
    } else if (hour >= 11 && hour < 17) {
      greetingText = 'צהריים טובים';
    } else if (hour >= 17 && hour < 21) {
      greetingText = 'ערב טוב';
    } else {
      greetingText = 'לילה טוב';
    }
    setGreeting(greetingText);
  }, [subtitles]); // Added 'subtitles' to the dependency array to satisfy exhaustive-deps linter rule.
                  // Since 'subtitles' is a constant array defined outside the component,
                  // its reference is stable and this effect will still only run once on mount.

  const quickActions = [
    { title: "ניהול פרויקטים", description: "עקוב אחר לו\"ז, כוח אדם ותזרים", icon: <Briefcase className="w-8 h-8" />, path: "ProjectManagement", color: "purple", gradient: "from-purple-500 to-pink-600" },
    { title: "הזנת נתונים", description: "להזין פרטים חדשים למחירון קבלן", icon: <Calculator className="w-8 h-8" />, path: "CostCalculator", color: "emerald", gradient: "from-emerald-500 to-teal-600" },
    { title: "הצעות שנשלחו", description: "עקוב אחר הצעות המחיר הקיימות", icon: <Send className="w-8 h-8" />, path: "SentQuotes", color: "blue", gradient: "from-blue-500 to-cyan-600" },
    { title: "ניהול פיננסי", description: "עקוב אחר הכנסות והוצאות", icon: <Landmark className="w-8 h-8" />, path: "Finance", color: "green", gradient: "from-green-500 to-emerald-600" },
    { title: "פרטי קבלן", description: "ערוך ונהל את תבנית החוזה שלך", icon: <FileSignature className="w-8 h-8" />, path: "ContractAgreement", color: "cyan", gradient: "from-cyan-500 to-sky-600" },
  ];

  if (userLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <style>{`@keyframes float-1 { 0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); opacity: 0.7; } 33% { transform: translateX(30px) translateY(-30px) rotate(120deg); opacity: 0.4; } 66% { transform: translateX(-20px) translateY(20px) rotate(240deg); opacity: 0.6; } } @keyframes float-2 { 0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); opacity: 0.5; } 50% { transform: translateX(-40px) translateY(-40px) rotate(180deg); opacity: 0.8; } } @keyframes float-3 { 0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); opacity: 0.6; } 25% { transform: translateX(50px) translateY(30px) rotate(90deg); opacity: 0.3; } 75% { transform: translateX(-30px) translateY(-20px) rotate(270deg); opacity: 0.7; } } @keyframes gradient-shift { 0% { background: linear-gradient(45deg, #f8fafc, #e0e7ff, #dbeafe); } 25% { background: linear-gradient(135deg, #f1f5f9, #e0e7ff, #ddd6fe); } 50% { background: linear-gradient(225deg, #f8fafc, #dbeafe, #e0f2fe); } 75% { background: linear-gradient(315deg, #f1f5f9, #ddd6fe, #e0e7ff); } 100% { background: linear-gradient(45deg, #f8fafc, #e0e7ff, #dbeafe); } } .animated-bg { animation: gradient-shift 20s ease-in-out infinite; } .float-element-1 { animation: float-1 25s ease-in-out infinite; } .float-element-2 { animation: float-2 30s ease-in-out infinite; } .float-element-3 { animation: float-3 35s ease-in-out infinite; } `}</style>
      <div className="fixed inset-0 animated-bg -z-10"></div>
      <div className="fixed inset-0 -z-5 pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-xl float-element-1"></div>
        <div className="absolute top-60 right-32 w-24 h-24 bg-gradient-to-bl from-indigo-200/15 to-cyan-200/15 rounded-lg blur-lg float-element-2"></div>
        <div className="absolute bottom-40 left-60 w-16 h-16 bg-gradient-to-tr from-purple-200/25 to-pink-200/25 rounded-full blur-md float-element-3"></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 bg-gradient-to-tl from-blue-300/10 to-teal-300/10 rounded-full blur-lg float-element-1"></div>
        <div className="absolute top-1/3 left-1/4 w-12 h-12 bg-gradient-to-br from-violet-200/20 to-blue-200/20 rounded-lg blur-sm float-element-2"></div>
      </div>
      <div className="space-y-8 p-6 max-w-7xl mx-auto relative z-10">
        <section className="relative overflow-hidden max-w-6xl mx-auto rounded-2xl group cursor-pointer shimmer-element">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600"></div>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative p-6 md:p-10 text-white">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold">לחשב חכם</h1>
            </div>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-4xl leading-relaxed">
              {dynamicSubtitle}
            </p>
            <div className="mt-8">
              {user && greeting && (
                <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-full backdrop-blur-sm w-fit">
                   <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                   <span className="text-lg font-medium text-white">
                     {greeting}, {user.full_name}
                   </span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto">
             <Button
                size="lg"
                className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 shimmer-element"
                onClick={() => navigate(createPageUrl('QuoteCreate'))}
            >
                <FilePlus2 className="w-6 h-6 ml-3" />
                הצעת מחיר חדשה
            </Button>
        </section>

        <section><RevenueChart user={user} /></section>
        <section><RecentQuotes user={user} /></section>
        <section><MonthlyCashFlowChart user={user} /></section>

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg"><ListChecks className="w-6 h-6 text-white" /></div>
            <h2 className="text-3xl font-bold text-gray-800">פעולות נוספות</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card key={action.title} className={`group relative overflow-hidden hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm border-0 cursor-pointer transform hover:-translate-y-2 shimmer-element hover:scale-105`} onClick={() => navigate(createPageUrl(action.path))}>
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <CardHeader className="relative pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <div className="text-white">{action.icon}</div>
                    </div>
                    <ArrowLeft className={`w-5 h-5 text-${action.color}-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300`} />
                  </div>
                  <CardTitle className={`text-xl font-bold text-gray-800 group-hover:text-${action.color}-700 transition-colors duration-300`}>{action.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="text-gray-600 leading-relaxed">{action.description}</CardDescription>
                  <div className={`mt-4 h-1 bg-gradient-to-r ${action.gradient} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right`}></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
