package com.kairos.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Measurable outcome; {@link #computeProgress()} matches rollup math. */
@Entity
@Table(name = "key_results")
public class KeyResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "objective_id", nullable = false)
    private Objective objective;

    @Column(name = "objective_id", insertable = false, updatable = false)
    private UUID objectiveId;

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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Objective getObjective() { return objective; }
    public void setObjective(Objective objective) {
        this.objective = objective;
        this.objectiveId = objective != null ? objective.getId() : null;
    }
    public UUID getObjectiveId() { return objectiveId; }
    public UUID getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(UUID wid) { this.workspaceId = wid; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMetricType() { return metricType; }
    public void setMetricType(String metricType) { this.metricType = metricType; }
    public BigDecimal getStartValue() { return startValue; }
    public void setStartValue(BigDecimal startValue) { this.startValue = startValue; }
    public BigDecimal getTargetValue() { return targetValue; }
    public void setTargetValue(BigDecimal tv) { this.targetValue = tv; }
    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal cv) { this.currentValue = cv; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getConfidence() { return confidence; }
    public void setConfidence(BigDecimal c) { this.confidence = c; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    /** KR progress 0–100; same formula as {@link com.kairos.service.OKRRollupService}. */
    @JsonProperty("progress")
    public BigDecimal computeProgress() {
        if (targetValue == null) return BigDecimal.ZERO;
        BigDecimal start = startValue != null ? startValue : BigDecimal.ZERO;
        BigDecimal current = currentValue != null ? currentValue : BigDecimal.ZERO;
        BigDecimal range = targetValue.subtract(start);
        if (range.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(targetValue) >= 0
                ? new BigDecimal("100") : BigDecimal.ZERO;
        }
        BigDecimal progress = current.subtract(start)
            .divide(range, 4, java.math.RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100"));
        return progress.max(BigDecimal.ZERO).min(new BigDecimal("100"));
    }
}
