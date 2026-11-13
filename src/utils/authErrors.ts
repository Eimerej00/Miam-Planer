export function extractFirebaseAuthCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === 'string' && maybeCode.trim().length > 0) {
    return maybeCode.trim();
  }
  const msg = (error as { message?: unknown }).message;
  if (typeof msg === 'string') {
    const match = msg.match(/\b(auth\/[a-z0-9-]+)\b/i);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

export function formatFirebaseAuthError(error: unknown, hostname?: string): string {
  const code = extractFirebaseAuthCode(error);
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const hostSuffix = hostname ? ` (${hostname})` : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Connexion Google annulée.';
  }
  if (code === 'auth/popup-blocked') {
    return 'La fenêtre Google a été bloquée par votre navigateur. Autorisez les popups pour ce site puis réessayez.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `Domaine non autorisé${hostSuffix} dans Firebase Authentication (${code}).`;
  }
  if (code === 'auth/operation-not-allowed') {
    return `Le fournisseur Google n’est pas activé dans Firebase Authentication (${code}).`;
  }
  if (
    code === 'auth/invalid-api-key' ||
    code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ||
    msg.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
    msg.includes('identitytoolkit')
  ) {
    return `Clé API Firebase invalide ou bloquée par restriction Google Cloud (${code || 'referer/API'}).`;
  }
  if (code === 'auth/network-request-failed') {
    return `Erreur réseau lors de la connexion Google (${code}).`;
  }
  if (code === 'auth/internal-error') {
    return `Erreur interne d’authentification Google (${code}). Vérifiez le client OAuth 2.0 et les restrictions de clé API dans Google Cloud Console.`;
  }
  if (code) {
    return `Impossible de finaliser la connexion Google (${code}).`;
  }
  return 'Impossible de finaliser la connexion Google. Réessayez.';
}
