package com.kairos.repository;

import com.kairos.model.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CheckInRepository extends JpaRepository<CheckIn, UUID> {
    List<CheckIn> findTop50ByOrderByCreatedAtDesc();
    List<CheckIn> findByKeyResultIdOrderByCreatedAtDesc(UUID keyResultId);
}
