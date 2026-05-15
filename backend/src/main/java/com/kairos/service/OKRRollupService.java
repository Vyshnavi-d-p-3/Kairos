package com.kairos.service;

import com.kairos.model.KeyResult;
import com.kairos.model.Objective;
import io.micrometer.observation.annotation.Observed;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

// Objective progress = average KR progress; recomputed after check-ins.
@Service
public class OKRRollupService {

    @Observed(
        name = "kairos.rollup.objective",
        contextualName = "okr-rollup",
        lowCardinalityKeyValues = {"component", "okr"}
    )
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
