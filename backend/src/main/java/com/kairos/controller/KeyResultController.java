package com.kairos.controller;

import com.kairos.model.KeyResult;
import com.kairos.repository.KeyResultRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/key-results")
public class KeyResultController {

    private final KeyResultRepository keyResults;

    public KeyResultController(KeyResultRepository keyResults) {
        this.keyResults = keyResults;
    }

    @GetMapping("/{id}")
    public ResponseEntity<KeyResult> get(@PathVariable UUID id) {
        return keyResults.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
