// SHA-256 digests of normalized (trim + lowercase) authorized Google emails.
// Plaintext addresses are intentionally omitted from client source/bundles.
const ALLOWED_EMAIL_SHA256_HASHES: ReadonlySet<string> = new Set([
  '59e4451f74cede67425afbff1923861880f16dd2f22dda0d3373b10c489c27ea',
  'e12630f08951f3309c569178b53fa918180d0c94feaeb8a76638cf356bd47899',
]);

const LEGACY_PIN_KEYS = [
  'miam_planner_pin_hash',
  'miam_planner_pin_salt',
  'miam_planner_session_unlocked',
  'miam_planner_session_ts',
  'miam_planner_pin_failures',
  'miam_planner_pin_lockout_until',
];

export function clearLegacyPinStorage(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  for (const key of LEGACY_PIN_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
}

export function normalizeEmail(email: string | null | undefined): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API indisponible pour la vérification de session.');
  }
  const encoded = new TextEncoder().encode(value);
  const digest = await subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isEmailWhitelisted(email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return false;
  const hash = await sha256Hex(normalized);
  return ALLOWED_EMAIL_SHA256_HASHES.has(hash);
}

export interface MinimalGoogleUser {
  email?: string | null;
  emailVerified?: boolean;
}

export type AccessCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'unverified' | 'unauthorized' };

export async function evaluateGoogleUserAccess(
  user: MinimalGoogleUser | null | undefined
): Promise<AccessCheckResult> {
  if (!user) {
    return { allowed: false, reason: 'unauthenticated' };
  }
  if (!user.emailVerified) {
    return { allowed: false, reason: 'unverified' };
  }
  const whitelisted = await isEmailWhitelisted(user.email);
  if (!whitelisted) {
    return { allowed: false, reason: 'unauthorized' };
  }
  return { allowed: true };
}
