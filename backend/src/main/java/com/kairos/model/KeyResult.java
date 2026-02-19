package com.kairos.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Key Result — measurable outcome attached to an Objective.
 * Tracks start_value → target_value with current_value updated via check-ins.
 */
@Entity
@Table(name = "key_results")
public class KeyResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "objective_id", nullable = false)
    private Objective objective;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false)
    private String title;

    @Column(name = "metric_type")
    private String metricType = "number"; // number, percentage, currency, boolean

    @Column(name = "start_value")
    private BigDecimal startValue = BigDecimal.ZERO;

    @Column(name = "target_value", nullable = false)
    private BigDecimal targetValue;

    @Column(name = "current_value")
    private BigDecimal currentValue = BigDecimal.ZERO;

    private String unit;

    @Column(precision = 3, scale = 2)
    private BigDecimal confidence = new BigDecimal("0.5");

    private String status = "on_track"; // on_track, at_risk, behind, completed

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Objective getObjective() { return objective; }
    public void setObjective(Objective objective) { this.objective = objective; }
    public UUID getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(UUID wid) { this.workspaceId = wid; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public BigDecimal getStartValue() { return startValue; }
    public BigDecimal getTargetValue() { return targetValue; }
    public void setTargetValue(BigDecimal tv) { this.targetValue = tv; }
    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal cv) { this.currentValue = cv; }
    public BigDecimal getConfidence() { return confidence; }
    public void setConfidence(BigDecimal c) { this.confidence = c; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    /**
     * Compute progress percentage: (current - start) / (target - start) * 100.
     * Clamped to [0, 100].
     */
    public BigDecimal computeProgress() {
        BigDecimal range = targetValue.subtract(startValue);
        if (range.compareTo(BigDecimal.ZERO) == 0) {
            return currentValue.compareTo(targetValue) >= 0
                ? new BigDecimal("100") : BigDecimal.ZERO;
        }
        BigDecimal progress = currentValue.subtract(startValue)
            .divide(range, 4, java.math.RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100"));
        return progress.max(BigDecimal.ZERO).min(new BigDecimal("100"));
    }
}
