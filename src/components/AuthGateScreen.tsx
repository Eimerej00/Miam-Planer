import React from 'react';
import { ShieldCheck, AlertCircle, Loader2, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { isFirebaseConfigured } from '../lib/firebase.ts';

export const AuthGateScreen: React.FC = () => {
  const { authReady, authError, isSigningIn, connectGoogleCloud } = useApp();

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-10 relative">
      {/* Subtle ambient background */}
      <div className="absolute top-12 left-10 w-56 h-56 bg-[#EAF0EC] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-12 right-10 w-64 h-64 bg-[#FDECE6] rounded-full blur-3xl opacity-50 pointer-events-none" />

      <main className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 relative z-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E2ECE4] border border-[#CCDCD0] flex items-center justify-center text-[#3D5A45] mb-5">
          <UtensilsCrossed className="w-7 h-7" strokeWidth={2.1} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
          Miam Planner
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 mb-7 leading-relaxed max-w-xs">
          Espace familial privé. Connectez-vous avec un compte Google autorisé pour accéder au planning et aux recettes.
        </p>

        {!authReady ? (
          <div
            className="w-full py-4 flex items-center justify-center gap-2.5 text-sm font-medium text-slate-600"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-4 h-4 animate-spin text-[#3D5A45]" />
            <span>Vérification de la session...</span>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {authError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 text-left text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {!isFirebaseConfigured ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  Clé Firebase manquante sur cet environnement. Ajoutez le secret{' '}
                  <code className="font-mono font-semibold">VITE_FIREBASE_API_KEY</code> dans
                  GitHub (Settings → Secrets → Actions) puis relancez le déploiement.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={connectGoogleCloud}
                disabled={isSigningIn}
                className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#3D5A45] hover:bg-[#324b39] active:scale-[0.99] text-white text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D5A45] cursor-pointer whitespace-nowrap"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                        />
                      </svg>
                    </span>
                    <span>Se connecter avec Google</span>
                  </>
                )}
              </button>
            )}

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#3D5A45] shrink-0" />
              <span>Accès restreint aux comptes autorisés</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
