package com.kairos.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CheckInDtos {

    public record CreateCheckInRequest(
        @NotNull BigDecimal newValue,
        BigDecimal confidence,
        String note,
        String status // optional override for key_result.status
    ) {}
}
