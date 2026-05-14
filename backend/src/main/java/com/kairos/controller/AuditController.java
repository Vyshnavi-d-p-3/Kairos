package com.kairos.controller;

import com.kairos.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private final JdbcTemplate jdbc;

    public AuditController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** RLS-scoped; ordering matches {@code idx_audit_workspace_created}. */
    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(required = false) String entityType) {
        UUID workspaceId = TenantContext.requireWorkspaceId();
        if (entityType == null) {
            return jdbc.queryForList(
                "SELECT id, workspace_id, actor_id, action, entity_type, entity_id, " +
                "       before_state, after_state, created_at " +
                "FROM audit_log " +
                "WHERE workspace_id = ?::uuid " +
                "ORDER BY created_at DESC LIMIT ?",
                workspaceId.toString(), limit
            );
        }
        return jdbc.queryForList(
            "SELECT id, workspace_id, actor_id, action, entity_type, entity_id, " +
            "       before_state, after_state, created_at " +
            "FROM audit_log " +
            "WHERE workspace_id = ?::uuid AND entity_type = ? " +
            "ORDER BY created_at DESC LIMIT ?",
            workspaceId.toString(), entityType, limit
        );
    }
}
