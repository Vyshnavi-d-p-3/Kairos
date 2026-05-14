package com.kairos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class KeyResultDtos {

    public record CreateKeyResultRequest(
        @NotBlank String title,
        String metricType,
        BigDecimal startValue,
        @NotNull BigDecimal targetValue,
        BigDecimal currentValue,
        String unit,
        BigDecimal confidence
    ) {}
}
