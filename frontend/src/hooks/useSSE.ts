"use client";

import { useEffect, useRef } from "react";

/** SSE via same-origin /api/stream; handler receives Spring event names + JSON payloads. */
export function useSSE(onEvent: (name: string, data: unknown) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const es = new EventSource("/api/stream");
    const events = [
      "connected",
      "objective.created",
      "objective.updated",
      "objective.deleted",
      "key_result.created",
      "check_in.created",
    ];
    const listeners: Array<[string, (e: MessageEvent) => void]> = events.map((name) => {
      const fn = (e: MessageEvent) => {
        try {
          handlerRef.current(name, JSON.parse(e.data));
        } catch {
          handlerRef.current(name, e.data);
        }
      };
      es.addEventListener(name, fn as EventListener);
      return [name, fn];
    });

    return () => {
      listeners.forEach(([name, fn]) => es.removeEventListener(name, fn as EventListener));
      es.close();
    };
  }, []);
}
