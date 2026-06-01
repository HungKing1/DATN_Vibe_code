package com.example.backend.controller;

import com.example.backend.dto.ai.DeleteLawResponse;
import com.example.backend.dto.ai.LawCreateResponse;
import com.example.backend.dto.ai.LawInfo;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.service.AiServerClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin REST controller — manages Law objects stored in Weaviate via AI Server.
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
     * List all distinct Law objects from Weaviate.
     */
    @GetMapping("/laws")
    public ApiResponse<List<LawInfo>> listLaws() {
        log.debug("Admin listing all laws from Weaviate");
        List<LawInfo> laws = aiServerClient.listLaws();
        return ApiResponse.success(laws);
    }

    /**
     * POST /api/v1/admin/laws
     * Ingest a Law from MongoDB into Weaviate.
     */
    @PostMapping("/laws")
    public ApiResponse<LawCreateResponse> createLaw(@RequestBody Map<String, String> body) {
        String tenDayDu = body.get("ten_day_du");
        log.info("Admin ingesting Law from MongoDB: {}", tenDayDu);
        LawCreateResponse response = aiServerClient.ingestFromMongodb(tenDayDu);
        return ApiResponse.success(response);
    }

    /**
     * POST /api/v1/admin/laws/{soKyHieu}/reload
     * Reload an existing Law from MongoDB.
     */
    @PostMapping("/laws/reload")
    public ApiResponse<LawCreateResponse> reloadLaw(
            @RequestParam String soKyHieu,
            @RequestBody Map<String, String> body) {
        String tenDayDu = body.get("ten_day_du");
        log.info("Admin reloading Law so_ky_hieu={} from MongoDB: {}", soKyHieu, tenDayDu);
        LawCreateResponse response = aiServerClient.reloadLaw(soKyHieu, tenDayDu);
        return ApiResponse.success(response);
    }

    /**
     * DELETE /api/v1/admin/laws/{soKyHieu}
     * Cascade-delete a Law and ALL its associated LegalChunk objects from Weaviate.
     */
    @DeleteMapping("/laws")
    public ApiResponse<DeleteLawResponse> deleteLaw(@RequestParam String soKyHieu) {
        log.info("Admin cascade-deleting Law so_ky_hieu={}", soKyHieu);
        DeleteLawResponse response = aiServerClient.deleteLaw(soKyHieu);
        return ApiResponse.success(response);
    }

    // ── AI Server Health ───────────────────────────────────────

    /**
     * GET /api/v1/admin/ai-health
     * Check if the AI Server (FastAPI) is reachable.
     */
    @GetMapping("/ai-health")
    public ApiResponse<Map<String, Object>> aiServerHealth() {
        Map<String, Object> healthStatus = aiServerClient.checkHealth();
        return ApiResponse.success(healthStatus);
    }
}
