import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Download,
  Upload,
  WifiOff,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { ActiveTab } from '../types/index.ts';

export const TopNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isOnline,
    exportBackupJson,
    importBackupJson,
    firebaseUser,
    cloudSyncStatus,
    cloudError,
    connectGoogleCloud,
    disconnectGoogleCloud,
  } = useApp();

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: 'planning', label: 'Planning' },
    { id: 'recettes', label: 'Recettes' },
    { id: 'planification', label: 'Planificateur' },
    { id: 'courses', label: 'Courses' },
    { id: 'historique', label: 'Historique' },
  ];

  const handleDownload = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miam-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const ok = importBackupJson(importText);
    if (ok) {
      setImportStatus('Sauvegarde restaurée avec succès !');
      setTimeout(() => {
        setShowBackupModal(false);
        setImportStatus(null);
        setImportText('');
      }, 1200);
    } else {
      setImportStatus('Erreur : format JSON invalide ou champs non conformes.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-lg bg-[#3D5A45] flex items-center justify-center text-white font-bold text-sm">
              M
            </span>
            <button
              onClick={() => setActiveTab('planning')}
              className="text-base font-bold tracking-tight text-slate-800 whitespace-nowrap shrink-0 hover:text-[#3D5A45] transition-colors cursor-pointer"
            >
              Miam Planner
            </button>
          </div>

          {/* Zone 2: Desktop clean text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navLinks.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive ? 'text-[#3D5A45] font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3D5A45] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions zone */}
          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span
                className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200"
                title="Mode hors-ligne : données sauvegardées localement"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hors-ligne</span>
              </span>
            )}

            <button
              onClick={() => setShowBackupModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                firebaseUser && cloudSyncStatus === 'synced'
                  ? 'bg-[#EAF0EC] text-[#3D5A45] border-[#CCDCD0]'
                  : cloudSyncStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Synchronisation Cloud & Sauvegarde"
              aria-label="Synchronisation Cloud et Sauvegarde"
            >
              {firebaseUser ? (
                <Cloud className="w-3.5 h-3.5" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">
                {firebaseUser ? 'Cloud actif' : 'Sync / Backup'}
              </span>
            </button>

            <button
              onClick={disconnectGoogleCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3D5A45] bg-[#EAF0EC] hover:bg-[#E2ECE4] border border-[#CCDCD0] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Backup & Cloud Sync Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 font-display mb-1">
              Synchronisation Cloud & Sauvegarde
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Connectez votre compte Google pour synchroniser vos données en temps réel dans votre espace privé Firestore, ou exportez une sauvegarde JSON.
            </p>

            {/* Google Auth & Cloud Sync Panel */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-slate-200/80 mb-4 space-y-2.5">
              {firebaseUser ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D5A45]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Compte privé connecté</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {firebaseUser.displayName || 'Compte Google autorisé'}
                    </p>
                  </div>
                  <button
                    onClick={disconnectGoogleCloud}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 bg-white border border-slate-200 rounded-lg cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectGoogleCloud}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-[#3D5A45]" />
                  Se connecter avec Google (Sync privée)
                </button>
              )}

              {cloudError && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{cloudError}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3D5A45] text-white text-sm font-medium hover:bg-[#324b39] transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                Télécharger la sauvegarde (.json)
              </button>

              <div className="border-t border-slate-100 my-1" />

              <label
                htmlFor="backup-import-textarea"
                className="text-xs font-semibold text-slate-700"
              >
                Restaurer une sauvegarde :
              </label>
              <textarea
                id="backup-import-textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Collez ici le contenu JSON de votre sauvegarde..."
                className="w-full h-24 p-2.5 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />

              {importStatus && (
                <p
                  className={`text-xs font-medium ${
                    importStatus.startsWith('Erreur') ? 'text-red-500' : 'text-[#3D5A45]'
                  }`}
                >
                  {importStatus}
                </p>
              )}

              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Importer et appliquer
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowBackupModal(false);
                  setImportStatus(null);
                }}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
