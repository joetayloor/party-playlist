import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useSocket(onMessage) {
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const reconnectTimer = useRef(null);
  const pendingQueue = useRef([]); // messages queued before WS opens
  const onOpenCallbacks = useRef([]); // callbacks to fire on open

  const flushQueue = useCallback(() => {
    while (pendingQueue.current.length > 0) {
      const msg = pendingQueue.current.shift();
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(msg));
      }
    }
    const cbs = onOpenCallbacks.current.splice(0);
    cbs.forEach(cb => cb());
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log('[WS] connected');
      clearTimeout(reconnectTimer.current);
      flushQueue();
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessageRef.current(msg);
      } catch (_) {}
    };

    ws.current.onclose = () => {
      console.log('[WS] disconnected, reconnecting...');
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.current.onerror = () => ws.current?.close();
  }, [flushQueue]);

  useEffect(() => {
    connect();
    const ping = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000);
    return () => {
      clearInterval(ping);
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  // send: if WS open → send immediately, else queue
  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    } else {
      pendingQueue.current.push(msg);
    }
  }, []);

  return { send };
}
