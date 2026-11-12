import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useApp();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-in">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Mode hors-ligne : vos modifications restent enregistrées localement</span>
    </div>
  );
};
