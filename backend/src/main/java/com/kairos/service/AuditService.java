package com.kairos.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.UUID;

/**
 * Immutable audit log — records every mutation with before/after state.
 *
 * Writes to a monthly-partitioned audit_log table (insert-only).
 * Captures: who (actor), what (action + entity), when, and the full
 * before/after JSONB state for complete audit trail.
 */
@Service
public class AuditService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AuditService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /**
     * Log an audit event.
     *
     * @param workspaceId Tenant context
     * @param actorId     User who performed the action
     * @param action      e.g., "objective.created", "key_result.updated"
     * @param entityType  e.g., "objective", "key_result", "check_in"
     * @param entityId    UUID of the affected entity
     * @param before      State before mutation (null for creates)
     * @param after       State after mutation (null for deletes)
     */
    public void log(
        UUID workspaceId,
        String actorId,
        String action,
        String entityType,
        UUID entityId,
        Object before,
        Object after
    ) {
        try {
            String beforeJson = before != null ? mapper.writeValueAsString(before) : null;
            String afterJson = after != null ? mapper.writeValueAsString(after) : null;

            jdbc.update(
                """
                INSERT INTO audit_log (workspace_id, actor_id, action, entity_type, entity_id, before_state, after_state)
                VALUES (?::uuid, ?, ?, ?, ?::uuid, ?::jsonb, ?::jsonb)
                """,
                workspaceId.toString(), actorId, action, entityType,
                entityId.toString(), beforeJson, afterJson
            );
        } catch (Exception e) {
            // Audit logging should never block the main operation
            // Log error but don't throw
            System.err.println("Audit log failed: " + e.getMessage());
        }
    }
}
