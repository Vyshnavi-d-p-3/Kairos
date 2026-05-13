package com.kairos.tenant;

import java.util.UUID;

/**
 * Request-scoped tenant (thread-local). Set in {@link com.kairos.filter.TenantContextFilter};
 * {@link com.kairos.config.RlsDataSourceConfig} reads {@link #workspaceId()} when opening
 * JDBC connections. Controllers/services use it for workspace_id and actor_id.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_WORKSPACE = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_ACTOR = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID workspaceId, String actorId) {
        if (workspaceId != null) CURRENT_WORKSPACE.set(workspaceId);
        if (actorId != null) CURRENT_ACTOR.set(actorId);
    }

    public static UUID workspaceId() { return CURRENT_WORKSPACE.get(); }
    public static String actorId() {
        String a = CURRENT_ACTOR.get();
        return a != null ? a : "system";
    }

    public static UUID requireWorkspaceId() {
        UUID w = CURRENT_WORKSPACE.get();
        if (w == null) {
            throw new IllegalStateException(
                "No tenant context — X-Workspace-Id header is required for this endpoint");
        }
        return w;
    }

    public static void clear() {
        CURRENT_WORKSPACE.remove();
        CURRENT_ACTOR.remove();
    }
}
