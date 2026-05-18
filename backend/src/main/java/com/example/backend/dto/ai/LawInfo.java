package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Maps to AI Server's LawInfo (Weaviate Law collection object).
 *
 * Weaviate is the source of truth for all Law metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LawInfo {

    @JsonProperty("law_uuid")
    private String lawUuid;

    private String title;
    private String description;
    private List<String> keywords;

    @JsonProperty("source_files")
    private List<String> sourceFiles;

    @JsonProperty("chunk_count")
    private int chunkCount;
}
