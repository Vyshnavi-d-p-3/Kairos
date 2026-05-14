package com.kairos.controller;

import com.kairos.model.Objective;
import com.kairos.repository.ObjectiveRepository;
import com.kairos.service.SSEBroadcaster;
import com.kairos.tenant.TenantContext;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/** Summary JSON + SSE stream for dashboard events (check-ins, objective CRUD, etc.). */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final ObjectiveRepository objectives;
    private final SSEBroadcaster sse;

    public DashboardController(ObjectiveRepository objectives, SSEBroadcaster sse) {
        this.objectives = objectives;
        this.sse = sse;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<Objective> all = objectives.findAllByOrderByCreatedAtDesc();

        int total = all.size();
        long completed = all.stream().filter(o -> "completed".equals(o.getStatus())).count();
        long active = all.stream().filter(o -> "active".equals(o.getStatus())).count();
        long atRisk = all.stream()
            .filter(o -> "active".equals(o.getStatus()))
            .filter(o -> o.getProgress() != null && o.getProgress().compareTo(new BigDecimal("30")) < 0)
            .count();

        BigDecimal avgProgress = total == 0
            ? BigDecimal.ZERO
            : all.stream()
                .map(o -> o.getProgress() == null ? BigDecimal.ZERO : o.getProgress())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);

        List<Map<String, Object>> progressByObjective = new ArrayList<>();
        for (Objective o : all) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", o.getId());
            row.put("title", o.getTitle());
            row.put("quarter", o.getQuarter());
            row.put("progress", o.getProgress() == null ? BigDecimal.ZERO : o.getProgress());
            row.put("status", o.getStatus());
            progressByObjective.add(row);
        }

        return Map.of(
            "totalObjectives", total,
            "active", active,
            "completed", completed,
            "atRisk", atRisk,
            "avgProgress", avgProgress,
            "objectives", progressByObjective
        );
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return sse.subscribe(TenantContext.requireWorkspaceId());
    }
}
