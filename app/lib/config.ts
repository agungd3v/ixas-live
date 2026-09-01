export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? '';
export const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST ?? '';
export const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'ws';
export const REVERB_IS_SECURE = REVERB_SCHEME === 'wss';
export const REVERB_PORT = REVERB_IS_SECURE
  ? 443
  : Number.parseInt(process.env.NEXT_PUBLIC_REVERB_PORT ?? '8080', 10);

/** Harmless off ngrok; skips ngrok's free-tier interstitial page. */
export const NGROK_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
};

/** Dipakai kalau GET /api/stream/ice-servers gagal. */
export const ICE_FALLBACK: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
