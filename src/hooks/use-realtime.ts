'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { RealtimeEvent } from '@/lib/realtime';

interface UseRealtimeReturn {
  connected: boolean;
  events: RealtimeEvent[];
  lastEvent: RealtimeEvent | null;
}

export function useRealtime(): UseRealtimeReturn {
  const { token, user } = useAppStore();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!token || !user) {
      // Disconnect when logged out
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setConnected(false));
      return;
    }

    function doConnect() {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const es = new EventSource(`/api/realtime?token=${encodeURIComponent(token!)}`);
        eventSourceRef.current = es;

        es.onopen = () => {
          setConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        es.onmessage = (e) => {
          try {
            const event: RealtimeEvent = JSON.parse(e.data);

            if (event.type === 'heartbeat') return;

            if (event.type === 'connected') {
              setConnected(true);
              return;
            }

            setLastEvent(event);
            setEvents((prev) => {
              const updated = [...prev, event];
              // Keep only last 50 events in memory
              if (updated.length > 50) return updated.slice(-50);
              return updated;
            });
          } catch (_e) {
            // Skip unparseable events
          }
        };

        es.onerror = () => {
          setConnected(false);
          es.close();
          eventSourceRef.current = null;

          // Auto-reconnect with exponential backoff
          const maxDelay = 30000; // 30 seconds max
          const baseDelay = 2000;
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
          reconnectAttemptsRef.current++;

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            doConnect();
          }, delay);
        };
      } catch (_e) {
        setConnected(false);
      }
    }

    doConnect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, user]);

  return { connected, events, lastEvent };
}
