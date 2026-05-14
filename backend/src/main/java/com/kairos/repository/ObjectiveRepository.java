package com.kairos.repository;

import com.kairos.model.Objective;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ObjectiveRepository extends JpaRepository<Objective, UUID> {
    List<Objective> findAllByOrderByCreatedAtDesc();
    List<Objective> findByQuarterOrderByCreatedAtDesc(String quarter);
}
