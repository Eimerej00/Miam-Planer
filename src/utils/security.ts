const PIN_STORAGE_KEY = 'miam_planner_pin_hash';
const PIN_SALT_KEY = 'miam_planner_pin_salt';
const SESSION_UNLOCKED_KEY = 'miam_planner_session_unlocked';
const SESSION_TIMESTAMP_KEY = 'miam_planner_session_ts';
const FAILED_ATTEMPTS_KEY = 'miam_planner_pin_failures';
const LOCKOUT_UNTIL_KEY = 'miam_planner_pin_lockout_until';

const AUTO_LOCK_MINUTES = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;
const PBKDF2_ITERATIONS = 100_000;

function generateCryptoSalt(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function legacySha256(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function derivePinHash(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `pbkdf2_v1:${hex}`;
}

export async function initDefaultPinIfEmpty(): Promise<void> {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(PIN_STORAGE_KEY);
  if (!existing) {
    const salt = generateCryptoSalt();
    localStorage.setItem(PIN_SALT_KEY, salt);
    const hash = await derivePinHash('1234', salt);
    localStorage.setItem(PIN_STORAGE_KEY, hash);
  }
}

export async function setMasterPin(newPin: string): Promise<boolean> {
  if (!newPin || !/^\d{4,8}$/.test(newPin)) return false;
  const salt = generateCryptoSalt();
  localStorage.setItem(PIN_SALT_KEY, salt);
  const hash = await derivePinHash(newPin, salt);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
  localStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
  localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  return true;
}

export async function verifyMasterPin(
  inputPin: string
): Promise<{ ok: boolean; lockoutSeconds?: number }> {
  if (typeof window === 'undefined') return { ok: false };

  const lockoutUntilStr = localStorage.getItem(LOCKOUT_UNTIL_KEY);
  if (lockoutUntilStr) {
    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    if (Date.now() < lockoutUntil) {
      return {
        ok: false,
        lockoutSeconds: Math.ceil((lockoutUntil - Date.now()) / 1000),
      };
    }
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  }

  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  const salt = localStorage.getItem(PIN_SALT_KEY) || '';
  let match = false;

  if (!storedHash) {
    match = inputPin === '1234';
    if (match) {
      await setMasterPin('1234');
    }
  } else if (storedHash.startsWith('pbkdf2_v1:')) {
    const inputHash = await derivePinHash(inputPin, salt);
    match = inputHash === storedHash;
  } else {
    const legacyHash = await legacySha256(`${inputPin}:${salt}`);
    match = legacyHash === storedHash;
    if (match) {
      // Transparently upgrade legacy SHA-256 PIN to PBKDF2
      const newSalt = generateCryptoSalt();
      const upgraded = await derivePinHash(inputPin, newSalt);
      localStorage.setItem(PIN_SALT_KEY, newSalt);
      localStorage.setItem(PIN_STORAGE_KEY, upgraded);
    }
  }

  if (match) {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
    localStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    return { ok: true };
  }

  const failures = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, String(failures));
  if (failures >= MAX_FAILED_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(LOCKOUT_UNTIL_KEY, String(until));
    return { ok: false, lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  return { ok: false };
}

export function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  const isUnlocked = localStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
  if (!isUnlocked) return false;

  const tsStr = localStorage.getItem(SESSION_TIMESTAMP_KEY);
  if (!tsStr) return false;
  const elapsedMinutes = (Date.now() - parseInt(tsStr, 10)) / (1000 * 60);

  if (elapsedMinutes > AUTO_LOCK_MINUTES) {
    lockSession();
    return false;
  }
  localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  return true;
}

export function lockSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_UNLOCKED_KEY);
  localStorage.removeItem(SESSION_TIMESTAMP_KEY);
}
