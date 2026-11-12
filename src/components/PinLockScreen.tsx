import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Lock, KeyRound, Delete } from 'lucide-react';

export const PinLockScreen: React.FC = () => {
  const { unlockWithPin, updateMasterPin } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changeStep, setChangeStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [infoMessage, setInfoMessage] = useState('');

  const handleDigit = async (digit: string) => {
    if (isChangingPin) {
      if (changeStep === 'current') {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          const res = await unlockWithPin(next);
          if (res.ok) {
            setPin('');
            setLockoutSeconds(null);
            setChangeStep('new');
            setInfoMessage('Saisissez votre nouveau code à 4 chiffres');
          } else {
            setError(true);
            if (res.lockoutSeconds) setLockoutSeconds(res.lockoutSeconds);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 600);
          }
        }
      } else if (changeStep === 'new') {
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 4) {
          setChangeStep('confirm');
          setInfoMessage('Confirmez votre nouveau code');
        }
      } else if (changeStep === 'confirm') {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === newPin) {
            await updateMasterPin(next);
            setIsChangingPin(false);
            setChangeStep('current');
            setPin('');
            setNewPin('');
            setConfirmPin('');
            setInfoMessage('Code PIN mis à jour avec succès !');
          } else {
            setError(true);
            setInfoMessage('Les codes ne correspondent pas. Réessayez.');
            setTimeout(() => {
              setConfirmPin('');
              setError(false);
            }, 600);
          }
        }
      }
      return;
    }

    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      const res = await unlockWithPin(next);
      if (!res.ok) {
        setError(true);
        if (res.lockoutSeconds) setLockoutSeconds(res.lockoutSeconds);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      } else {
        setLockoutSeconds(null);
      }
    }
  };

  const handleDelete = () => {
    if (isChangingPin) {
      if (changeStep === 'current') setPin((p) => p.slice(0, -1));
      if (changeStep === 'new') setNewPin((p) => p.slice(0, -1));
      if (changeStep === 'confirm') setConfirmPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => p.slice(0, -1));
  };

  const currentDisplayPin = isChangingPin
    ? changeStep === 'current'
      ? pin
      : changeStep === 'new'
      ? newPin
      : confirmPin
    : pin;

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-none">
      {/* Decorative calm background shapes */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-[#EAF0EC] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-56 h-56 bg-[#FDECE6] rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-xs flex flex-col items-center relative z-10">
        {/* Brand mark */}
        <div className="w-16 h-16 rounded-2xl bg-[#E2ECE4] border border-[#CCDCD0] flex items-center justify-center text-[#3D5A45] mb-5 shadow-sm">
          <Lock className="w-7 h-7" strokeWidth={2.2} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-800 text-center font-display">
          Miam Planner
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-6 text-center">
          {isChangingPin
            ? infoMessage || 'Modification du code PIN'
            : 'Verrou local familial · Code PIN requis'}
        </p>

        {/* Pin dots */}
        <div
          className={`flex items-center gap-4 mb-8 transition-transform ${
            error ? 'animate-bounce text-red-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < currentDisplayPin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#3D5A45] border-[#3D5A45] scale-110'
                    : 'bg-white border-slate-300'
                } ${error ? 'bg-red-400 border-red-500' : ''}`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-medium text-red-500 mb-4 animate-fade-in text-center">
            {lockoutSeconds
              ? `Trop d'essais. Réessayez dans ${lockoutSeconds}s.`
              : 'Code incorrect. Réessayez.'}
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3.5 w-full mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              aria-label={`Chiffre ${digit}`}
              className="h-14 rounded-2xl bg-white border border-slate-200 text-slate-800 font-semibold text-xl active:scale-95 active:bg-[#F4EFEA] hover:border-slate-300 transition-all flex items-center justify-center shadow-xs cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {isChangingPin ? (
              <button
                onClick={() => {
                  setIsChangingPin(false);
                  setPin('');
                  setNewPin('');
                  setConfirmPin('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 p-2 cursor-pointer"
              >
                Annuler
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsChangingPin(true);
                  setChangeStep('current');
                  setPin('');
                  setInfoMessage('Entrez le code actuel (défaut : 1234)');
                }}
                className="p-2 text-slate-400 hover:text-[#3D5A45] transition-colors cursor-pointer"
                title="Modifier le code PIN"
                aria-label="Modifier le code PIN"
              >
                <KeyRound className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleDigit('0')}
            aria-label="Chiffre 0"
            className="h-14 rounded-2xl bg-white border border-slate-200 text-slate-800 font-semibold text-xl active:scale-95 active:bg-[#F4EFEA] hover:border-slate-300 transition-all flex items-center justify-center shadow-xs cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/60 border border-slate-200 text-slate-500 active:scale-95 active:bg-[#F4EFEA] hover:text-slate-800 transition-all flex items-center justify-center cursor-pointer"
            title="Effacer"
            aria-label="Effacer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Tip / Default info */}
        <div className="bg-[#EAF0EC]/60 border border-[#CCDCD0]/60 rounded-xl px-3 py-2 text-center w-full">
          <p className="text-[11px] text-[#3D5A45] leading-relaxed">
            <span className="font-semibold">Code initial :</span> 1234
            <br />
            Verrou local d'appareil · Données cloud sécurisées par Google Auth.
          </p>
        </div>
      </div>
    </div>
  );
};
