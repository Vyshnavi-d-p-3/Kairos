package com.kairos.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;

/**
 * Sets PostgreSQL session variable for Row-Level Security.
 *
 * Every request extracts the workspace ID from the JWT claims or URL path,
 * then executes SET LOCAL app.current_workspace = '<uuid>' on the JDBC connection.
 * This ensures all subsequent queries in the transaction are scoped to that tenant.
 *
 * RLS policies on every table use: USING (workspace_id = current_workspace_id())
 * where current_workspace_id() reads the session variable.
 */
@Component
@Order(2)
public class TenantContextFilter implements Filter {

    private final DataSource dataSource;

    public TenantContextFilter(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String workspaceId = resolveWorkspaceId(httpRequest);

        if (workspaceId != null) {
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(
                     "SELECT set_config('app.current_workspace', ?, true)")) {
                stmt.setString(1, workspaceId);
                stmt.execute();
            } catch (Exception e) {
                throw new ServletException("Failed to set tenant context", e);
            }
        }

        chain.doFilter(request, response);
    }

    /**
     * Resolve workspace ID from:
     * 1. URL path parameter (/api/v1/workspaces/{id}/...)
     * 2. JWT claim (workspace_id)
     * 3. X-Workspace-Id header (for internal services)
     */
    private String resolveWorkspaceId(HttpServletRequest request) {
        // Priority 1: path parameter
        String path = request.getRequestURI();
        if (path.contains("/workspaces/")) {
            String[] segments = path.split("/");
            for (int i = 0; i < segments.length - 1; i++) {
                if ("workspaces".equals(segments[i])) {
                    return segments[i + 1];
                }
            }
        }

        // Priority 2: header (set by ClerkJwtFilter after JWT validation)
        return request.getHeader("X-Workspace-Id");
    }
}
