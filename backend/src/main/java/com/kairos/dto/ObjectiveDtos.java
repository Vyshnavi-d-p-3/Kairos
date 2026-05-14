package com.kairos.dto;

import jakarta.validation.constraints.NotBlank;

public class ObjectiveDtos {

    public record CreateObjectiveRequest(
        @NotBlank String title,
        String description,
        @NotBlank String ownerId,
        @NotBlank String quarter
    ) {}

    public record UpdateObjectiveRequest(
        String title,
        String description,
        String status,
        String quarter
    ) {}
}
