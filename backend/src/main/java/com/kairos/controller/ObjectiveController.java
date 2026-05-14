package com.kairos.controller;

import com.kairos.dto.KeyResultDtos.CreateKeyResultRequest;
import com.kairos.dto.ObjectiveDtos.CreateObjectiveRequest;
import com.kairos.dto.ObjectiveDtos.UpdateObjectiveRequest;
import com.kairos.model.KeyResult;
import com.kairos.model.Objective;
import com.kairos.repository.KeyResultRepository;
import com.kairos.repository.ObjectiveRepository;
import com.kairos.service.AuditService;
import com.kairos.service.SSEBroadcaster;
import com.kairos.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/objectives")
public class ObjectiveController {

    private final ObjectiveRepository objectives;
    private final KeyResultRepository keyResults;
    private final AuditService audit;
    private final SSEBroadcaster sse;

    public ObjectiveController(ObjectiveRepository objectives,
                               KeyResultRepository keyResults,
                               AuditService audit,
                               SSEBroadcaster sse) {
        this.objectives = objectives;
        this.keyResults = keyResults;
        this.audit = audit;
        this.sse = sse;
    }

    @GetMapping
    public List<Objective> list(@RequestParam(required = false) String quarter) {
        return quarter == null
            ? objectives.findAllByOrderByCreatedAtDesc()
            : objectives.findByQuarterOrderByCreatedAtDesc(quarter);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Objective> get(@PathVariable UUID id) {
        return objectives.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Objective> create(@Valid @RequestBody CreateObjectiveRequest req) {
        UUID workspaceId = TenantContext.requireWorkspaceId();

        Objective o = new Objective();
        o.setWorkspaceId(workspaceId);
        o.setTitle(req.title());
        o.setDescription(req.description());
        o.setOwnerId(req.ownerId());
        o.setQuarter(req.quarter());
        o.setProgress(BigDecimal.ZERO);

        Objective saved = objectives.save(o);
        audit.log(workspaceId, TenantContext.actorId(), "objective.created",
            "objective", saved.getId(), null, saved);
        sse.broadcast(workspaceId, "objective.created",
            Map.of("objectiveId", saved.getId(), "title", saved.getTitle()));

        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<Objective> update(@PathVariable UUID id,
                                             @RequestBody UpdateObjectiveRequest req) {
        return objectives.findById(id)
            .map(o -> {
                Map<String, Object> before = snapshot(o);
                if (req.title() != null) o.setTitle(req.title());
                if (req.description() != null) o.setDescription(req.description());
                if (req.status() != null) o.setStatus(req.status());
                if (req.quarter() != null) o.setQuarter(req.quarter());
                o.setUpdatedAt(Instant.now());
                Objective saved = objectives.save(o);
                audit.log(saved.getWorkspaceId(), TenantContext.actorId(),
                    "objective.updated", "objective", saved.getId(), before, snapshot(saved));
                sse.broadcast(saved.getWorkspaceId(), "objective.updated",
                    Map.of("objectiveId", saved.getId()));
                return ResponseEntity.ok(saved);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        return objectives.findById(id)
            .map(o -> {
                Map<String, Object> before = snapshot(o);
                objectives.delete(o);
                audit.log(o.getWorkspaceId(), TenantContext.actorId(),
                    "objective.deleted", "objective", id, before, null);
                sse.broadcast(o.getWorkspaceId(), "objective.deleted",
                    Map.of("objectiveId", id));
                return ResponseEntity.noContent().<Void>build();
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/key-results")
    @Transactional
    public ResponseEntity<KeyResult> addKeyResult(@PathVariable UUID id,
                                                   @Valid @RequestBody CreateKeyResultRequest req) {
        return objectives.findById(id).map(o -> {
            KeyResult kr = new KeyResult();
            kr.setObjective(o);
            kr.setWorkspaceId(o.getWorkspaceId());
            kr.setTitle(req.title());
            if (req.metricType() != null) kr.setMetricType(req.metricType());
            kr.setStartValue(nz(req.startValue()));
            kr.setTargetValue(req.targetValue());
            kr.setCurrentValue(nz(req.currentValue()));
            kr.setUnit(req.unit());
            if (req.confidence() != null) kr.setConfidence(req.confidence());

            KeyResult saved = keyResults.save(kr);
            audit.log(o.getWorkspaceId(), TenantContext.actorId(),
                "key_result.created", "key_result", saved.getId(), null, saved);
            sse.broadcast(o.getWorkspaceId(), "key_result.created",
                Map.of("objectiveId", o.getId(), "keyResultId", saved.getId()));
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private static Map<String, Object> snapshot(Objective o) {
        return Map.of(
            "title", String.valueOf(o.getTitle()),
            "description", String.valueOf(o.getDescription()),
            "status", String.valueOf(o.getStatus()),
            "quarter", String.valueOf(o.getQuarter()),
            "progress", o.getProgress() == null ? "0" : o.getProgress().toPlainString()
        );
    }
}
