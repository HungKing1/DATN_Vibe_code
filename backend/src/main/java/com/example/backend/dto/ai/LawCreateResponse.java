package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Maps to AI Server's IngestionResultDto.
 *
 * Returned after ingesting a Law from MongoDB.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LawCreateResponse {

    @JsonProperty("so_ky_hieu")
    private String soKyHieu;

    @JsonProperty("ten_day_du")
    private String tenDayDu;

    @JsonProperty("chunks_stored")
    private int chunksStored;

    private boolean success;

    @JsonProperty("error_message")
    private String errorMessage;

    private String status;
}
