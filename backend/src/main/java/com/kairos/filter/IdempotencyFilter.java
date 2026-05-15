package com.kairos.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Optional {@code Idempotency-Key}: cache 2xx JSON in Redis 24h per workspace; replay on retry. */
@Component
@Order(4)
public class IdempotencyFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyFilter.class);
    private static final String HEADER = "Idempotency-Key";
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redis;

    public IdempotencyFilter(StringRedisTemplate redis) { this.redis = redis; }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String method = req.getMethod();
        if (!("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method))) {
            chain.doFilter(request, response);
            return;
        }
        String key = req.getHeader(HEADER);
        if (key == null || key.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        String workspaceId = req.getHeader("X-Workspace-Id");
        String redisKey = "idempotency:" + (workspaceId != null ? workspaceId : "global") + ":" + key;

        String cached = null;
        try {
            cached = redis.opsForValue().get(redisKey);
        } catch (Exception e) {
            // redis down: skip the cache, don't 500
            log.warn("idempotency cache read failed: {}", e.getMessage());
        }
        if (cached != null) {
            res.setContentType("application/json");
            res.setHeader("Idempotency-Replayed", "true");
            res.setStatus(HttpServletResponse.SC_OK);
            res.getWriter().write(cached);
            return;
        }

        BufferingResponseWrapper wrapper = new BufferingResponseWrapper(res);
        chain.doFilter(request, wrapper);
        wrapper.flushBuffer();

        int status = wrapper.getStatus();
        if (status >= 200 && status < 300) {
            String body = wrapper.getCapturedBody();
            if (body != null && !body.isBlank()) {
                try {
                    redis.opsForValue().set(redisKey, body, TTL);
                } catch (Exception e) {
                    log.warn("idempotency cache write failed: {}", e.getMessage());
                }
            }
        }
    }

    private static final class BufferingResponseWrapper extends HttpServletResponseWrapper {
        private final ByteArrayOutputStream buffer = new ByteArrayOutputStream(1024);
        private ServletOutputStream stream;
        private PrintWriter writer;

        BufferingResponseWrapper(HttpServletResponse response) { super(response); }

        @Override public ServletOutputStream getOutputStream() throws IOException {
            if (writer != null) throw new IllegalStateException("getWriter already called");
            if (stream == null) {
                ServletOutputStream delegate = super.getOutputStream();
                stream = new ServletOutputStream() {
                    @Override public boolean isReady() { return delegate.isReady(); }
                    @Override public void setWriteListener(WriteListener l) { delegate.setWriteListener(l); }
                    @Override public void write(int b) throws IOException {
                        delegate.write(b);
                        buffer.write(b);
                    }
                    @Override public void write(byte[] b, int off, int len) throws IOException {
                        delegate.write(b, off, len);
                        buffer.write(b, off, len);
                    }
                };
            }
            return stream;
        }

        @Override public PrintWriter getWriter() throws IOException {
            if (stream != null) throw new IllegalStateException("getOutputStream already called");
            if (writer == null) {
                writer = new PrintWriter(getOutputStream(), false, StandardCharsets.UTF_8);
            }
            return writer;
        }

        @Override public void flushBuffer() throws IOException {
            if (writer != null) writer.flush();
            super.flushBuffer();
        }

        String getCapturedBody() {
            try { return buffer.toString(StandardCharsets.UTF_8); }
            catch (Exception e) { return null; }
        }
    }
}
