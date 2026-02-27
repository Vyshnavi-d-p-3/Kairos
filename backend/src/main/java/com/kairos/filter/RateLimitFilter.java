package com.kairos.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

/**
 * Sliding window rate limiter per workspace using Redis sorted sets.
 *
 * Pattern: ZADD key timestamp timestamp → ZRANGEBYSCORE to count in window.
 * O(log N) per operation, no fixed window boundary issues.
 *
 * Default: 100 requests per minute per workspace.
 */
@Component
@Order(5)
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS = 100;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final StringRedisTemplate redis;

    public RateLimitFilter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String workspaceId = httpRequest.getHeader("X-Workspace-Id");
        if (workspaceId == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = "ratelimit:" + workspaceId;
        long now = Instant.now().toEpochMilli();
        long windowStart = now - WINDOW.toMillis();

        // Remove expired entries
        redis.opsForZSet().removeRangeByScore(key, 0, windowStart);

        // Count current requests in window
        Long count = redis.opsForZSet().zCard(key);

        if (count != null && count >= MAX_REQUESTS) {
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write(
                "{\"error\":\"Rate limit exceeded\",\"retry_after_seconds\":60}"
            );
            return;
        }

        // Add current request
        redis.opsForZSet().add(key, String.valueOf(now), now);
        redis.expire(key, WINDOW.plusSeconds(10));

        // Add rate limit headers
        httpResponse.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS));
        httpResponse.setHeader("X-RateLimit-Remaining", String.valueOf(MAX_REQUESTS - (count != null ? count + 1 : 1)));

        chain.doFilter(request, response);
    }
}
