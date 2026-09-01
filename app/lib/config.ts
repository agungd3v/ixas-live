export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? '';
export const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST ?? '';
export const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'ws';
export const REVERB_IS_SECURE = REVERB_SCHEME === 'wss';
export const REVERB_PORT = REVERB_IS_SECURE ? 443 : Number.parseInt(process.env.NEXT_PUBLIC_REVERB_PORT ?? '8080', 10);

export const NGROK_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
};

/**
 * STUN selalu ada. TURN (relay) opsional lewat env wajib kalau host & viewer
 * beda jaringan dengan NAT ketat. Default memakai TURN publik gratis untuk
 * testing; ganti dengan TURN sendiri (coturn) untuk produksi.
 *   NEXT_PUBLIC_TURN_URLS=turn:host:3478,turns:host:5349
 *   NEXT_PUBLIC_TURN_USERNAME=...
 *   NEXT_PUBLIC_TURN_CREDENTIAL=...
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME ?? '',
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? '',
    });
  }

  return servers;
}

export const ICE_SERVERS: RTCIceServer[] = buildIceServers();
