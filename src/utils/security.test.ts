import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeEmail,
  sha256Hex,
  sha256FallbackHex,
  isEmailWhitelisted,
  extractGoogleUserEmail,
  evaluateGoogleUserAccess,
} from './security.ts';
import { extractFirebaseAuthCode, formatFirebaseAuthError } from './authErrors.ts';

test('normalizeEmail trims whitespace and lowercases email', () => {
  assert.equal(normalizeEmail('  User@Example.COM  '), 'user@example.com');
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
});

test('sha256FallbackHex matches WebCrypto sha256Hex exactly', async () => {
  for (const sample of ['', 'abc', 'jeremie.lecorney@gmail.com', 'jenni.mans00@gmail.com']) {
    assert.equal(sha256FallbackHex(sample), await sha256Hex(sample));
  }
});

test('isEmailWhitelisted permits only the two authorized emails regardless of case/spacing', async () => {
  assert.equal(await isEmailWhitelisted('jeremie.lecorney@gmail.com'), true);
  assert.equal(await isEmailWhitelisted('  JEREMIE.LECORNEY@GMAIL.COM '), true);
  assert.equal(await isEmailWhitelisted('jenni.mans00@gmail.com'), true);
  assert.equal(await isEmailWhitelisted('Jenni.Mans00@gmail.com'), true);

  assert.equal(await isEmailWhitelisted('autre@gmail.com'), false);
  assert.equal(await isEmailWhitelisted('jeremie.lecorney@googlemail.com'), false);
  assert.equal(await isEmailWhitelisted('jenni.mans0@gmail.com'), false);
  assert.equal(await isEmailWhitelisted(''), false);
  assert.equal(await isEmailWhitelisted(null), false);
});

test('extractGoogleUserEmail resolves email from top-level user or providerData', () => {
  assert.equal(
    extractGoogleUserEmail({
      email: null,
      providerData: [{ providerId: 'google.com', email: 'Jenni.Mans00@gmail.com' }],
    }),
    'jenni.mans00@gmail.com'
  );
  assert.equal(extractGoogleUserEmail({ email: '  Jeremie.Lecorney@gmail.com ' }), 'jeremie.lecorney@gmail.com');
  assert.equal(extractGoogleUserEmail(null), '');
});

test('evaluateGoogleUserAccess enforces authentication, verified email, and whitelist', async () => {
  assert.deepEqual(await evaluateGoogleUserAccess(null), {
    allowed: false,
    reason: 'unauthenticated',
  });

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'jeremie.lecorney@gmail.com',
      emailVerified: false,
    }),
    { allowed: false, reason: 'unverified' }
  );

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'intrus@gmail.com',
      emailVerified: true,
    }),
    { allowed: false, reason: 'unauthorized' }
  );

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'jeremie.lecorney@gmail.com',
      emailVerified: true,
    }),
    { allowed: true }
  );

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: null,
      emailVerified: true,
      providerData: [{ providerId: 'google.com', email: 'jenni.mans00@gmail.com' }],
    }),
    { allowed: true }
  );
});

test('client security source does not expose plaintext allowlisted email addresses', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/security.ts'), 'utf8');
  assert.equal(source.toLowerCase().includes('jeremie.lecorney'), false);
  assert.equal(source.toLowerCase().includes('jenni.mans00'), false);
});

test('extractFirebaseAuthCode and formatFirebaseAuthError surface diagnostic codes', () => {
  assert.equal(
    extractFirebaseAuthCode({ code: 'auth/unauthorized-domain' }),
    'auth/unauthorized-domain'
  );
  assert.equal(
    extractFirebaseAuthCode(new Error('Firebase: Error (auth/operation-not-allowed).')),
    'auth/operation-not-allowed'
  );

  assert.match(
    formatFirebaseAuthError({ code: 'auth/unauthorized-domain' }, 'eimerej00.github.io'),
    /eimerej00\.github\.io.*auth\/unauthorized-domain/
  );
  assert.match(
    formatFirebaseAuthError({ code: 'auth/operation-not-allowed' }),
    /auth\/operation-not-allowed/
  );
  assert.match(
    formatFirebaseAuthError(new Error('API_KEY_HTTP_REFERRER_BLOCKED')),
    /restriction Google Cloud/
  );
  assert.equal(
    formatFirebaseAuthError({ code: 'auth/popup-closed-by-user' }),
    'Connexion Google annulée.'
  );
});
