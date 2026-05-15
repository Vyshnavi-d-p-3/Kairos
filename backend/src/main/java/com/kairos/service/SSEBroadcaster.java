package com.kairos.service;

import io.micrometer.observation.annotation.Observed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/** In-memory SSE clients per workspace; one JVM only (no Redis fan-out). */
@Service
public class SSEBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(SSEBroadcaster.class);
    private static final long TIMEOUT_MS = 30 * 60 * 1000L;

    private final ConcurrentHashMap<UUID, List<SseEmitter>> emittersByWorkspace =
        new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID workspaceId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        List<SseEmitter> bucket = emittersByWorkspace.computeIfAbsent(
            workspaceId, k -> new CopyOnWriteArrayList<>());
        bucket.add(emitter);

        emitter.onCompletion(() -> bucket.remove(emitter));
        emitter.onTimeout(() -> bucket.remove(emitter));
        emitter.onError(e -> bucket.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            bucket.remove(emitter);
        }
        return emitter;
    }

    @Observed(name = "kairos.sse.broadcast", contextualName = "sse-broadcast",
        lowCardinalityKeyValues = {"component", "sse"})
    public void broadcast(UUID workspaceId, String event, Object payload) {
        List<SseEmitter> bucket = emittersByWorkspace.get(workspaceId);
        if (bucket == null || bucket.isEmpty()) return;

        for (SseEmitter emitter : bucket) {
            try {
                emitter.send(SseEmitter.event().name(event).data(payload));
            } catch (Exception e) {
                log.debug("SSE emitter dropped: {}", e.getMessage());
                bucket.remove(emitter);
            }
        }
    }
}
