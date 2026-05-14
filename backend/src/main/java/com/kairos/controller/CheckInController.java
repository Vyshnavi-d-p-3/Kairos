package com.kairos.controller;

import com.kairos.dto.CheckInDtos.CreateCheckInRequest;
import com.kairos.model.CheckIn;
import com.kairos.model.KeyResult;
import com.kairos.model.Objective;
import com.kairos.repository.CheckInRepository;
import com.kairos.repository.KeyResultRepository;
import com.kairos.repository.ObjectiveRepository;
import com.kairos.service.AuditService;
import com.kairos.service.OKRRollupService;
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

/** Append-only check-ins update KR values, rollup parent objective progress, audit + SSE. */
@RestController
@RequestMapping("/api/v1/key-results/{krId}")
public class CheckInController {

    private final KeyResultRepository keyResults;
    private final ObjectiveRepository objectives;
    private final CheckInRepository checkIns;
    private final OKRRollupService rollup;
    private final AuditService audit;
    private final SSEBroadcaster sse;

    public CheckInController(KeyResultRepository keyResults,
                             ObjectiveRepository objectives,
                             CheckInRepository checkIns,
                             OKRRollupService rollup,
                             AuditService audit,
                             SSEBroadcaster sse) {
        this.keyResults = keyResults;
        this.objectives = objectives;
        this.checkIns = checkIns;
        this.rollup = rollup;
        this.audit = audit;
        this.sse = sse;
    }

    @GetMapping("/check-ins")
    public List<CheckIn> list(@PathVariable UUID krId) {
        return checkIns.findByKeyResultIdOrderByCreatedAtDesc(krId);
    }

    @PostMapping("/check-ins")
    @Transactional
    public ResponseEntity<?> submit(@PathVariable UUID krId,
                                    @Valid @RequestBody CreateCheckInRequest req) {
        KeyResult kr = keyResults.findById(krId).orElse(null);
        if (kr == null) return ResponseEntity.notFound().build();

        UUID workspaceId = kr.getWorkspaceId();
        BigDecimal previous = kr.getCurrentValue() == null ? BigDecimal.ZERO : kr.getCurrentValue();

        CheckIn ci = new CheckIn();
        ci.setKeyResultId(kr.getId());
        ci.setWorkspaceId(workspaceId);
        ci.setAuthorId(TenantContext.actorId());
        ci.setPreviousValue(previous);
        ci.setNewValue(req.newValue());
        ci.setConfidence(req.confidence());
        ci.setNote(req.note());
        CheckIn savedCi = checkIns.save(ci);

        Map<String, Object> krBefore = krSnapshot(kr);
        kr.setCurrentValue(req.newValue());
        if (req.confidence() != null) kr.setConfidence(req.confidence());
        if (req.status() != null) kr.setStatus(req.status());
        // Auto-mark completed when we hit/exceed the target.
        if (req.newValue().compareTo(kr.getTargetValue()) >= 0) kr.setStatus("completed");
        kr.setUpdatedAt(Instant.now());
        keyResults.save(kr);

        Objective parent = objectives.findById(kr.getObjectiveId()).orElseThrow();
        BigDecimal newProgress = rollup.computeObjectiveProgress(parent);
        parent.setUpdatedAt(Instant.now());
        objectives.save(parent);

        audit.log(workspaceId, TenantContext.actorId(), "check_in.created",
            "check_in", savedCi.getId(), null, savedCi);
        audit.log(workspaceId, TenantContext.actorId(), "key_result.updated",
            "key_result", kr.getId(), krBefore, krSnapshot(kr));

        sse.broadcast(workspaceId, "check_in.created", Map.of(
            "checkInId", savedCi.getId(),
            "keyResultId", kr.getId(),
            "objectiveId", parent.getId(),
            "previousValue", previous,
            "newValue", req.newValue(),
            "objectiveProgress", newProgress
        ));

        return ResponseEntity.ok(Map.of(
            "checkIn", savedCi,
            "keyResult", kr,
            "objectiveProgress", newProgress
        ));
    }

    private static Map<String, Object> krSnapshot(KeyResult kr) {
        return Map.of(
            "currentValue", kr.getCurrentValue() == null ? "0" : kr.getCurrentValue().toPlainString(),
            "confidence", kr.getConfidence() == null ? "0" : kr.getConfidence().toPlainString(),
            "status", String.valueOf(kr.getStatus())
        );
    }
}
