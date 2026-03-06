package com.kairos.service;

import com.kairos.model.KeyResult;
import com.kairos.model.Objective;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Computes Objective progress from child Key Results.
 *
 * When a check-in updates a KeyResult's current_value, this service
 * recomputes the parent Objective's progress as the weighted average
 * of all KR progress percentages.
 *
 * Formula: objective.progress = avg(kr.computeProgress() for each kr)
 */
@Service
public class OKRRollupService {

    /**
     * Recompute objective progress from all key results.
     * Called after every check-in submission.
     *
     * @param objective The objective to update (with key results loaded)
     * @return Updated progress value (0-100)
     */
    public BigDecimal computeObjectiveProgress(Objective objective) {
        List<KeyResult> keyResults = objective.getKeyResults();

        if (keyResults == null || keyResults.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalProgress = BigDecimal.ZERO;
        int count = 0;

        for (KeyResult kr : keyResults) {
            totalProgress = totalProgress.add(kr.computeProgress());
            count++;
        }

        BigDecimal avgProgress = totalProgress.divide(
            BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP
        );

        objective.setProgress(avgProgress);
        updateObjectiveStatus(objective);

        return avgProgress;
    }

    /**
     * Auto-update objective status based on progress and KR statuses.
     *
     * Rules:
     * - If all KRs are completed → objective = completed
     * - If any KR is behind and progress < 30% → objective stays active (at risk)
     * - If progress = 100% → completed
     */
    private void updateObjectiveStatus(Objective objective) {
        List<KeyResult> krs = objective.getKeyResults();
        if (krs == null) return;

        boolean allCompleted = krs.stream()
            .allMatch(kr -> "completed".equals(kr.getStatus()));

        if (allCompleted || objective.getProgress().compareTo(new BigDecimal("100")) >= 0) {
            objective.setStatus("completed");
        }
    }
}
