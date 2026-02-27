package com.kairos.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

/**
 * Idempotency filter — prevents duplicate writes from retry storms.
 *
 * Implements the Stripe idempotency pattern:
 * 1. Client sends Idempotency-Key header on all mutating requests
 * 2. Filter checks Redis for existing key
 * 3. If found: return cached response (no processing)
 * 4. If not found: process request, cache response with 24h TTL
 *
 * Redis key format: idempotency:{workspace_id}:{key}
 */
@Component
@Order(4)
public class IdempotencyFilter implements Filter {

    private static final String HEADER = "Idempotency-Key";
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redis;

    public IdempotencyFilter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Only apply to mutating methods
        String method = httpRequest.getMethod();
        if (!("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method))) {
            chain.doFilter(request, response);
            return;
        }

        String idempotencyKey = httpRequest.getHeader(HEADER);
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        String workspaceId = httpRequest.getHeader("X-Workspace-Id");
        String redisKey = buildKey(workspaceId, idempotencyKey);

        // Check for cached response
        String cached = redis.opsForValue().get(redisKey);
        if (cached != null) {
            httpResponse.setContentType("application/json");
            httpResponse.setStatus(200);
            httpResponse.getWriter().write(cached);
            return;
        }

        // Process request, then cache result
        // TODO: Wrap response to capture body for caching
        chain.doFilter(request, response);

        // TODO: Cache response body in Redis with TTL
        redis.opsForValue().set(redisKey, "{\"status\":\"processed\"}", TTL);
    }

    private String buildKey(String workspaceId, String key) {
        return "idempotency:" + (workspaceId != null ? workspaceId : "global") + ":" + key;
    }
}
