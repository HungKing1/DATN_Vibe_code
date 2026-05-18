package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Per-file result inside a batch Law ingestion response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileIngestionResult {

    @JsonProperty("file_name")
    private String fileName;

    @JsonProperty("chunks_stored")
    private int chunksStored;

    private boolean success;
    private String error;
}
