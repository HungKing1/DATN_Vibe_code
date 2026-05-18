package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Maps to AI Server's DeleteLawResponse.
 *
 * Returned after cascade-deleting a Law and all its LawChunk objects from Weaviate.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteLawResponse {

    @JsonProperty("law_uuid")
    private String lawUuid;

    @JsonProperty("chunks_deleted")
    private int chunksDeleted;

    @JsonProperty("law_deleted")
    private boolean lawDeleted;

    private String status;
}
