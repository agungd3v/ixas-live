import { API_URL, ICE_FALLBACK, NGROK_HEADERS } from './config';

export type StreamRow = {
  id: number;
  name: string;
  company_name: string | null;
  is_online: boolean;
  last_seen_at: string | null;
};

export async function fetchStreams(signal?: AbortSignal): Promise<StreamRow[]> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL belum di-set');

  const res = await fetch(`${API_URL}/api/streams`, {
    headers: { Accept: 'application/json', ...NGROK_HEADERS },
    cache: 'no-store',
    signal,
  });

  if (!res.ok) throw new Error(`GET /api/streams gagal (${res.status})`);
  return res.json();
}

/** ICE servers (STUN/TURN) dari portal. Provider TURN diatur di .env portal. */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  if (!API_URL) return ICE_FALLBACK;
  try {
    const res = await fetch(`${API_URL}/api/stream/ice-servers`, {
      headers: { Accept: 'application/json', ...NGROK_HEADERS },
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json.ice_servers) && json.ice_servers.length
      ? json.ice_servers
      : ICE_FALLBACK;
  } catch {
    return ICE_FALLBACK;
  }
}
