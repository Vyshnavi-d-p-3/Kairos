package com.kairos.repository;

import com.kairos.model.KeyResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface KeyResultRepository extends JpaRepository<KeyResult, UUID> {
    List<KeyResult> findByObjectiveIdOrderByCreatedAtAsc(UUID objectiveId);
}
