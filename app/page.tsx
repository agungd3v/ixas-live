'use client';

import { useCallback, useEffect, useState } from 'react';

import { StreamViewer } from '@/app/components/stream-viewer';
import { API_URL } from '@/app/lib/config';
import { fetchStreams, type StreamRow } from '@/app/lib/streams';

const POLL_MS = 5000;

export default function Home() {
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchingId, setWatchingId] = useState<number | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const rows = await fetchStreams(signal);
      setStreams(rows);
      setError(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Fetch + poll. setState hanya terjadi setelah fetch selesai (async).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal);
    const timer = setInterval(() => load(), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  const online = streams.filter((s) => s.is_online);
  const offline = streams.filter((s) => !s.is_online);

  // Derived: only keep the viewer open while that stream is still online.
  const watching =
    watchingId != null ? (online.find((s) => s.id === watchingId) ?? null) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 bg-black p-6 text-white">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">IXAS Live</h1>
        <span className="text-xs text-zinc-500">
          {online.length} online · refresh tiap {POLL_MS / 1000}s
        </span>
      </header>

      {watching ? (
        <StreamViewer
          streamId={watching.id}
          streamName={watching.name}
          onClose={() => setWatchingId(null)}
        />
      ) : (
        <section className="flex flex-col gap-4">
          {!API_URL && (
            <Banner tone="error">
              NEXT_PUBLIC_API_URL belum di-set di .env.local
            </Banner>
          )}
          {error && <Banner tone="error">{error}</Banner>}
          {loading && streams.length === 0 && (
            <p className="text-sm text-zinc-500">Memuat daftar stream…</p>
          )}

          {online.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Online
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {online.map((s) => (
                  <StreamCard
                    key={s.id}
                    stream={s}
                    onWatch={() => setWatchingId(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {offline.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Offline
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {offline.map((s) => (
                  <StreamCard key={s.id} stream={s} onWatch={() => {}} />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && streams.length === 0 && (
            <p className="text-sm text-zinc-500">
              Belum ada stream terdaftar. Buat lewat menu Streams di admin portal.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

function StreamCard({
  stream,
  onWatch,
}: {
  stream: StreamRow;
  onWatch: () => void;
}) {
  const online = stream.is_online;
  return (
    <button
      onClick={onWatch}
      disabled={!online}
      className="flex flex-col items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors enabled:hover:border-zinc-600 disabled:opacity-40"
    >
      <div className="flex w-full items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            online ? 'bg-green-500' : 'bg-zinc-600'
          }`}
        />
        <span className="truncate text-sm font-medium">{stream.name}</span>
      </div>
      <span className="truncate text-xs text-zinc-500">
        {stream.company_name ?? '-'}
      </span>
      <span className="text-xs text-zinc-600">
        {online ? 'Klik untuk menonton' : 'Offline'}
      </span>
    </button>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: 'error';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'error'
      ? 'border-red-900 bg-red-950/50 text-red-300'
      : 'border-zinc-800 bg-zinc-900 text-zinc-300';
  return (
    <div className={`rounded-lg border px-4 py-2 text-sm ${cls}`}>{children}</div>
  );
}
