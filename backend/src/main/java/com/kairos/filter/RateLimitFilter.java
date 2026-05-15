package com.kairos.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

/** Per-workspace Redis ZSET sliding window (~60s; limit from {@code kairos.ratelimit.requests-per-minute}). Skips SSE + actuator. */
@Component
@Order(5)
public class RateLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    @Value("${kairos.ratelimit.requests-per-minute:300}")
    private int maxRequests;

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final StringRedisTemplate redis;

    public RateLimitFilter(StringRedisTemplate redis) { this.redis = redis; }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())
                || path.contains("/dashboard/stream")
                || path.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        String workspaceId = req.getHeader("X-Workspace-Id");
        if (workspaceId == null || workspaceId.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        // fail open if redis is down — better than 500ing everything
        try {
            String key = "ratelimit:" + workspaceId;
            long now = Instant.now().toEpochMilli();
            long windowStart = now - WINDOW.toMillis();

            redis.opsForZSet().removeRangeByScore(key, 0, windowStart);
            Long count = redis.opsForZSet().zCard(key);

            if (count != null && count >= maxRequests) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.setHeader("Retry-After", "60");
                res.getWriter().write(
                    "{\"error\":\"Rate limit exceeded\",\"retry_after_seconds\":60}"
                );
                return;
            }

            redis.opsForZSet().add(key, now + ":" + Thread.currentThread().getId(), now);
            redis.expire(key, WINDOW.plusSeconds(10));

            long used = (count != null ? count : 0) + 1;
            res.setHeader("X-RateLimit-Limit", String.valueOf(maxRequests));
            res.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, maxRequests - used)));
        } catch (Exception e) {
            log.warn("rate limit: redis unavailable, allowing through: {}", e.getMessage());
        }

        chain.doFilter(request, response);
    }
}
