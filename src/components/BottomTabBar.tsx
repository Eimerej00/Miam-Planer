import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { CalendarDays, BookOpen, Wand2, ShoppingCart, History } from 'lucide-react';
import type { ActiveTab } from '../types/index.ts';

export const BottomTabBar: React.FC = () => {
  const { activeTab, setActiveTab, groceryItems } = useApp();

  const uncheckedGroceriesCount = groceryItems.filter((i) => !i.checked).length;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'planning', label: 'Planning', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'recettes', label: 'Recettes', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'planification', label: 'Planifier', icon: <Wand2 className="w-5 h-5" /> },
    {
      id: 'courses',
      label: 'Courses',
      icon: (
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          {uncheckedGroceriesCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#D97D64] text-white text-[10px] font-bold flex items-center justify-center">
              {uncheckedGroceriesCount > 99 ? '99+' : uncheckedGroceriesCount}
            </span>
          )}
        </div>
      ),
    },
    { id: 'historique', label: 'Historique', icon: <History className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 safe-area-bottom">
      <div className="grid grid-cols-5 items-center h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
                isActive ? 'text-[#3D5A45]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative flex items-center justify-center">{tab.icon}</div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-all ${
                  isActive ? 'font-bold text-[#3D5A45]' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#3D5A45] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
