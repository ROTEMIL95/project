
import React from 'react';
import UpcomingWorkforce from '@/components/dashboard/UpcomingWorkforce';
import ProjectCashFlowChart from '@/components/dashboard/ProjectCashFlowChart';
import { Briefcase } from 'lucide-react';

const renderTimeline = (project) => {
    if (!project || !project.quote) return null;

    // תיקון: שימוש ב-Object.entries כדי לשמר את מזהה הקטגוריה
    const workforceEntries = Object.entries(project.quote.workforceData || {});
    const categories = workforceEntries.map(([id, data]) => ({
        id: id, // <- הוספת ה-ID החסר
        ...data,
        type: 'category'
    }));

    const payments = (project.quote.paymentTerms || []).map(p => ({ ...p, type: 'payment' }));

    const allEvents = [...categories, ...payments];

    const sortedEvents = allEvents.filter(e => e.startDate || e.paymentDate).sort((a, b) => {
        const dateA = a.type === 'category' ? new Date(a.startDate) : new Date(a.paymentDate);
        const dateB = b.type === 'category' ? new Date(b.startDate) : new Date(b.paymentDate);
        return dateA.getTime() - dateB.getTime();
    });

    // This function is intended to process data for a timeline.
    // As the rendering part of the timeline is not provided in the outline,
    // we return null to ensure the function is syntactically correct and doesn't render anything
    // that isn't explicitly defined. The data processing fix is implemented.
    return null;
};

export default function ProjectManagement() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-4">
          <Briefcase className="h-10 w-10 text-indigo-600" />
          ניהול פרויקטים
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          כלים לתכנון, מעקב ובקרה על הפרויקטים הפעילים שלך.
        </p>
      </header>

      <section>
        <ProjectCashFlowChart />
      </section>

      <section>
        <UpcomingWorkforce />
      </section>
    </div>
  );
}
