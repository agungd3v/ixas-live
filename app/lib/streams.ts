import { API_URL, NGROK_HEADERS } from './config';

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
