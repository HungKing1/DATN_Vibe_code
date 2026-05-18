package com.example.backend.controller;

import com.example.backend.dto.ai.DeleteLawResponse;
import com.example.backend.dto.ai.FilesAddToLawResponse;
import com.example.backend.dto.ai.LawCreateResponse;
import com.example.backend.dto.ai.LawInfo;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.service.AiServerClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Admin REST controller — manages Law objects stored in Weaviate.
 *
 * All Law data (title, description, chunk_count, source_files) comes
 * directly from Weaviate via AI Server. Weaviate is the source of truth.
 *
 * Endpoint prefix: /api/v1/admin
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AiServerClient aiServerClient;

    // ── Law Management (Weaviate source of truth) ───────────────

    /**
     * GET /api/v1/admin/laws
     * List all Law objects from Weaviate.
     */
    @GetMapping("/laws")
    public ApiResponse<List<LawInfo>> listLaws() {
        log.debug("Admin listing all laws from Weaviate");
        List<LawInfo> laws = aiServerClient.listLaws();
        return ApiResponse.success(laws);
    }

    /**
     * POST /api/v1/admin/laws
     * Create a new Law by uploading 1 or more PDF files.
     * AI Server will generate title, description, keywords via LLM.
     */
    @PostMapping("/laws")
    public ApiResponse<LawCreateResponse> createLaw(
            @RequestParam("files") List<MultipartFile> files
    ) throws IOException {
        log.info("Admin creating new Law from {} file(s)", files.size());
        LawCreateResponse response = aiServerClient.createLaw(files);
        return ApiResponse.success(response);
    }

    /**
     * POST /api/v1/admin/laws/{lawUuid}/files
     * Add 1 or more files to an existing Law.
     */
    @PostMapping("/laws/{lawUuid}/files")
    public ApiResponse<FilesAddToLawResponse> addFilesToLaw(
            @PathVariable String lawUuid,
            @RequestParam("files") List<MultipartFile> files
    ) throws IOException {
        log.info("Admin adding {} file(s) to Law uuid={}", files.size(), lawUuid);
        FilesAddToLawResponse response = aiServerClient.addFilesToLaw(lawUuid, files);
        return ApiResponse.success(response);
    }

    /**
     * DELETE /api/v1/admin/laws/{lawUuid}
     * Cascade-delete a Law and ALL its associated LawChunk objects from Weaviate.
     *
     * Execution order on AI Server:
     * 1. Batch-delete all LawChunk objects where law_uuid matches.
     * 2. Delete the Law object itself.
     */
    @DeleteMapping("/laws/{lawUuid}")
    public ApiResponse<DeleteLawResponse> deleteLaw(@PathVariable String lawUuid) {
        log.info("Admin cascade-deleting Law uuid={}", lawUuid);
        DeleteLawResponse response = aiServerClient.deleteLaw(lawUuid);
        return ApiResponse.success(response);
    }

    // ── Document Chunk Management ───────────────────────────────

    /**
     * DELETE /api/v1/admin/documents
     * Delete a document's chunks from LawChunk collection.
     */
    @DeleteMapping("/documents")
    public ApiResponse<String> deleteDocument(@RequestBody Map<String, String> body) {
        String documentId = body.get("document_id");
        String collectionName = body.getOrDefault("collection_name", "LawChunk");

        aiServerClient.deleteDocument(documentId, collectionName);
        return ApiResponse.success("Document '" + documentId + "' deleted successfully");
    }

    // ── AI Server Health ───────────────────────────────────────

    /**
     * GET /api/v1/admin/ai-health
     * Check if the AI Server (FastAPI) is reachable.
     */
    @GetMapping("/ai-health")
    public ApiResponse<Map<String, Object>> aiServerHealth() {
        boolean healthy = aiServerClient.isHealthy();
        return ApiResponse.success(Map.of(
                "ai_server", healthy ? "healthy" : "unhealthy",
                "message", healthy ? "AI Server is running" : "AI Server is not reachable"
        ));
    }
}
