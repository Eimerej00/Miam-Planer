import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Clock, RefreshCw } from 'lucide-react';

export const HistoryTab: React.FC = () => {
  const { schedule, setWeekOffset, setActiveTab } = useApp();

  const pastWeeks = Object.keys(schedule)
    .map((dateKey) => new Date(dateKey + 'T12:00:00'))
    .filter((date) => date < new Date())
    .map((date) => formatDateKey(date))
    .sort((a, b) => b.localeCompare(a)); // Descending

  const uniqueWeeks = Array.from(new Set(pastWeeks.map(d => d.substring(0, 7))));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 font-display">Historique des menus</h2>
      <div className="grid gap-4">
        {uniqueWeeks.map(month => (
          <div key={month} className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-2">{month}</h3>
            <button
              onClick={() => {
                setWeekOffset(-1); // Simplified for now
                setActiveTab('planning');
              }}
              className="text-sm text-[#3D5A45] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Voir le menu de cette semaine et réutiliser
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}
