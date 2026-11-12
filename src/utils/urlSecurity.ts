import net from 'node:net';
import dns from 'node:dns/promises';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.split('%')[0].trim().toLowerCase();

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast & reserved
    return false;
  }

  if (net.isIPv6(cleanIp)) {
    if (cleanIp === '::' || cleanIp === '::1') return true;
    if (cleanIp.startsWith('::ffff:')) {
      const mapped = cleanIp.slice('::ffff:'.length);
      if (net.isIPv4(mapped)) {
        return isPrivateOrReservedIp(mapped);
      }
      // Handle hex-encoded IPv4 mapped addresses like ::ffff:7f00:1
      const hexParts = mapped.split(':');
      if (hexParts.length === 2) {
        const hi = parseInt(hexParts[0], 16);
        const lo = parseInt(hexParts[1], 16);
        if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
          const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
          return isPrivateOrReservedIp(ipv4);
        }
      }
      return true;
    }
    // Unique local (fc00::/7) and link-local (fe80::/10)
    if (/^(fc|fd)/i.test(cleanIp)) return true;
    if (/^fe[89ab]/i.test(cleanIp)) return true;
    if (cleanIp.startsWith('ff')) return true; // multicast
    return false;
  }

  return true;
}

export function validateExternalRecipeUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0 || rawUrl.length > 1000) {
    return { ok: false, reason: 'URL invalide ou trop longue.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'Format d’URL invalide.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Seuls les protocoles HTTP et HTTPS sont autorisés.' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'Les identifiants intégrés dans l’URL sont interdits.' };
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { ok: false, reason: 'Port réseau non autorisé.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa')
  ) {
    return { ok: false, reason: 'Hôte interne ou local interdit.' };
  }

  if (net.isIP(host) && isPrivateOrReservedIp(host)) {
    return { ok: false, reason: 'Adresse IP privée ou réservée interdite.' };
  }

  return { ok: true, url: parsed };
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  const cleanHost = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(cleanHost)) {
    if (isPrivateOrReservedIp(cleanHost)) {
      throw new Error('Adresse IP privée ou réservée interdite.');
    }
    return;
  }

  const records = await dns.lookup(cleanHost, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Impossible de résoudre le nom de domaine.');
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error('Le domaine cible pointe vers une adresse réseau privée.');
    }
  }
}
