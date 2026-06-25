'use client';

import { useRef, useState } from 'react';

type Status = 'idle' | 'connecting' | 'connected' | 'error';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Live',
  error: 'Connection failed',
};

const STATUS_COLOR: Record<Status, string> = {
  idle: 'bg-zinc-600',
  connecting: 'bg-yellow-500 animate-pulse',
  connected: 'bg-green-500',
  error: 'bg-red-500',
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  function cleanup() {
    wsRef.current?.close();
    pcRef.current?.close();
    wsRef.current = null;
    pcRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function connect() {
    if (!url.trim()) return;
    cleanup();
    setStatus('connecting');

    const ws = new WebSocket(url.trim());
    wsRef.current = ws;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setStatus('connected');
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'candidate', data: candidate.toJSON() }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('idle');
      }
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', data: { type: answer.type, sdp: answer.sdp } }));
      } else if (msg.type === 'candidate' && msg.data) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.data));
      }
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      if (status !== 'connected') setStatus('idle');
    };
  }

  function disconnect() {
    cleanup();
    setStatus('idle');
  }

  const isConnected = status === 'connected' || status === 'connecting';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-6">
      {/* Video */}
      <div className="w-full max-w-5xl aspect-video bg-zinc-900 rounded-xl overflow-hidden relative flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">
              {status === 'connecting' ? 'Waiting for stream...' : 'No stream connected'}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-5xl flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[status]}`} />
          <span className="text-sm text-zinc-400">{STATUS_LABEL[status]}</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isConnected && connect()}
            placeholder="wss://ip:port"
            disabled={isConnected}
            className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-4 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-40"
          />
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={!url.trim()}
              className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-30"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-5 py-2.5 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
