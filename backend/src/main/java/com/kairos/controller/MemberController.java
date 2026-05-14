package com.kairos.controller;

import com.kairos.model.WorkspaceMember;
import com.kairos.repository.WorkspaceMemberRepository;
import com.kairos.service.AuditService;
import com.kairos.tenant.TenantContext;
import jakarta.validation.constraints.NotBlank;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/members")
public class MemberController {

    private final WorkspaceMemberRepository members;
    private final AuditService audit;

    public MemberController(WorkspaceMemberRepository members, AuditService audit) {
        this.members = members;
        this.audit = audit;
    }

    @GetMapping
    public List<WorkspaceMember> list() {
        return members.findAll();
    }

    @PostMapping
    @Transactional
    public WorkspaceMember invite(@RequestBody InviteRequest req) {
        UUID workspaceId = TenantContext.requireWorkspaceId();
        WorkspaceMember m = new WorkspaceMember();
        m.setWorkspaceId(workspaceId);
        m.setUserId(req.userId());
        m.setEmail(req.email());
        m.setDisplayName(req.displayName());
        m.setRole(req.role() == null ? "member" : req.role());
        m.setInvitedAt(Instant.now());
        WorkspaceMember saved = members.save(m);

        // audit_log.entity_id is UUID; derive stable id from userId for joins
        audit.log(workspaceId, TenantContext.actorId(), "member.invited", "member",
            UUID.nameUUIDFromBytes(("member:" + req.userId()).getBytes()), null, saved);
        return saved;
    }

    public record InviteRequest(
        @NotBlank String userId,
        @NotBlank String email,
        String displayName,
        String role
    ) {}
}
