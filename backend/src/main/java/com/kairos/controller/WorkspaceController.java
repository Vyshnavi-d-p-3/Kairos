package com.kairos.controller;

import com.kairos.model.Workspace;
import com.kairos.repository.WorkspaceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceRepository workspaces;

    public WorkspaceController(WorkspaceRepository workspaces) {
        this.workspaces = workspaces;
    }

    // Table has no RLS — list is global to the DB user (demo lists all workspaces).
    @GetMapping
    public List<Workspace> list() {
        return workspaces.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Workspace> get(@PathVariable UUID id) {
        return workspaces.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
