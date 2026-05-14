package com.kairos.repository;

import com.kairos.model.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceMemberRepository
        extends JpaRepository<WorkspaceMember, WorkspaceMember.PK> {
}
