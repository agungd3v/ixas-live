'use client';

import Pusher from 'pusher-js';
import type { PresenceChannel } from 'pusher-js';
import { useEffect, useRef, useState } from 'react';

import {
  API_URL,
  ICE_SERVERS,
  NGROK_HEADERS,
  PUSHER_KEY,
  REVERB_HOST,
  REVERB_IS_SECURE,
  REVERB_PORT,
} from '@/app/lib/config';

type Status = 'connecting' | 'waiting' | 'live' | 'error';

const STATUS_LABEL: Record<Status, string> = {
  connecting: 'Menyambungkan…',
  waiting: 'Menunggu stream dari host…',
  live: 'Live',
  error: 'Koneksi gagal',
};

const STATUS_COLOR: Record<Status, string> = {
  connecting: 'bg-yellow-500 animate-pulse',
  waiting: 'bg-yellow-500 animate-pulse',
  live: 'bg-green-500',
  error: 'bg-red-500',
};

type SignalPayload = {
  viewerId: string;
  data: RTCSessionDescriptionInit & RTCIceCandidateInit;
};

export function StreamViewer({ streamId, streamName, onClose }: { streamId: number, streamName: string, onClose: () => void }) {
  const [status, setStatus] = useState<Status>('connecting');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: 'mt1',
      wsHost: REVERB_HOST,
      wsPort: REVERB_PORT,
      wssPort: REVERB_PORT,
      forceTLS: REVERB_IS_SECURE,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${API_URL}/api/stream/viewer-auth`,
      auth: {
        headers: { ...NGROK_HEADERS },
        params: { stream_id: String(streamId) },
      },
    });

    let pc: RTCPeerConnection | null = null;
    let myId: string | null = null;
    let disposed = false;

    const channel = pusher.subscribe(
      `presence-stream.${streamId}`,
    ) as PresenceChannel;

    channel.bind('pusher:subscription_succeeded', () => {
      myId = channel.members.me.id;
      setStatus('waiting');
    });

    channel.bind('pusher:subscription_error', (err: unknown) => {
      console.error('[viewer] subscription error', err);
      setStatus('error');
    });

    pusher.connection.bind('error', (err: unknown) => {
      console.error('[viewer] pusher error', err);
      setStatus('error');
    });

    // Host mengirim offer, dialamatkan ke member id viewer ini.
    channel.bind('client-offer', async ({ viewerId, data }: SignalPayload) => {
      if (disposed || viewerId !== myId) return;

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('live');
        }
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          channel.trigger('client-candidate', {
            viewerId: myId,
            data: candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (!pc) return;
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('error');
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channel.trigger('client-answer', {
        viewerId: myId,
        data: { type: answer.type, sdp: answer.sdp },
      });
    });

    channel.bind(
      'client-candidate',
      async ({ viewerId, data }: SignalPayload) => {
        if (disposed || viewerId !== myId || !pc || !data) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          console.warn('[viewer] addIceCandidate', err);
        }
      },
    );

    return () => {
      disposed = true;
      pc?.close();
      pusher.disconnect();
    };
  }, [streamId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
          <span className="text-sm text-zinc-300">
            {streamName} · {STATUS_LABEL[status]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Tutup
        </button>
      </div>

      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        {status !== 'live' && (
          <p className="absolute text-sm text-zinc-500">{STATUS_LABEL[status]}</p>
        )}
      </div>
    </div>
  );
}
