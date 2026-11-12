import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { PinLockScreen } from './components/PinLockScreen.tsx';
import { TopNav } from './components/TopNav.tsx';
import { BottomTabBar } from './components/BottomTabBar.tsx';
import { PlanningTab } from './components/tabs/PlanningTab.tsx';
import { RecipesTab } from './components/tabs/RecipesTab.tsx';
import { PlanGeneratorTab } from './components/tabs/PlanGeneratorTab.tsx';
import { GroceriesTab } from './components/tabs/GroceriesTab.tsx';
import { HistoryTab } from './components/tabs/HistoryTab.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';

const AppShell: React.FC = () => {
  const { isLocked, activeTab } = useApp();

  if (isLocked) {
    return <PinLockScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col selection:bg-[#E2ECE4] selection:text-[#2D4534]">
      {/* Top Bar */}
      <TopNav />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
        {/* PWA Install Promo Bar on Top if installable */}
        <div className="mb-4 flex justify-end">
          <PWAInstallButton />
        </div>

        {/* Tab views */}
        {activeTab === 'planning' && <PlanningTab />}
        {activeTab === 'recettes' && <RecipesTab />}
        {activeTab === 'planification' && <PlanGeneratorTab />}
        {activeTab === 'courses' && <GroceriesTab />}
        {activeTab === 'historique' && <HistoryTab />}
      </main>

      {/* Bottom Navigation for mobile */}
      <BottomTabBar />

      {/* Offline Status Badge */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
