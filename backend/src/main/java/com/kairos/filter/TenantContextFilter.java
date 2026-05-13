package com.kairos.filter;

import com.kairos.tenant.TenantContext;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Puts {@code X-Workspace-Id} (or {@code /workspaces/{id}/…}) and {@code X-User-Id} into
 * {@link com.kairos.tenant.TenantContext}. Session GUC {@code app.current_workspace} is set on
 * the JDBC connection in {@link com.kairos.config.RlsDataSourceConfig}, not here.
 *
 * <p>TODO: replace header parsing with JWT verification.
 */
@Component
@Order(2)
public class TenantContextFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest http = (HttpServletRequest) request;
        String workspaceId = resolveWorkspaceId(http);
        String actorId = http.getHeader("X-User-Id");

        try {
            if (workspaceId != null) {
                try {
                    TenantContext.set(UUID.fromString(workspaceId), actorId);
                } catch (IllegalArgumentException ignored) {
                    // malformed uuid: leave context empty, let the controllers 400
                }
            }
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String resolveWorkspaceId(HttpServletRequest request) {
        String header = request.getHeader("X-Workspace-Id");
        if (header != null && !header.isBlank()) return header;

        String path = request.getRequestURI();
        if (path.contains("/workspaces/")) {
            String[] segments = path.split("/");
            for (int i = 0; i < segments.length - 1; i++) {
                if ("workspaces".equals(segments[i])) {
                    return segments[i + 1];
                }
            }
        }
        return null;
    }
}
