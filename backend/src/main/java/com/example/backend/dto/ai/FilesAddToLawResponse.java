package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Maps to AI Server's FilesAddToLawResponse.
 *
 * Returned after adding 1 or more files to an existing Law.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilesAddToLawResponse {

    @JsonProperty("law_uuid")
    private String lawUuid;

    @JsonProperty("total_files")
    private int totalFiles;

    private int successful;
    private int failed;

    @JsonProperty("total_chunks_added")
    private int totalChunksAdded;

    private List<FileIngestionResult> results;

    private String status;
}
