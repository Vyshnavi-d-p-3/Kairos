package com.kairos.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.observation.annotation.Observed;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

// Append-only audit rows; failures swallowed so mutations are not rolled back.
@Service
public class AuditService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AuditService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Observed(name = "kairos.audit.log", contextualName = "audit-write",
        lowCardinalityKeyValues = {"component", "audit"})
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
            // never throw from here — audit must not break the actual mutation
            System.err.println("audit log failed: " + e.getMessage());
        }
    }
}
