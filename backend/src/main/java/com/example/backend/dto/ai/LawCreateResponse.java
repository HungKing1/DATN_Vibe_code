package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Maps to AI Server's LawCreateBatchResponse.
 *
 * Returned after creating a new Law from 1 or more files.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LawCreateResponse {

    @JsonProperty("law_uuid")
    private String lawUuid;

    private String title;
    private String description;

    @JsonProperty("source_files")
    private List<String> sourceFiles;

    @JsonProperty("chunk_count")
    private int chunkCount;

    @JsonProperty("total_files")
    private int totalFiles;

    private int successful;
    private int failed;

    private List<FileIngestionResult> results;

    private String status;
}
