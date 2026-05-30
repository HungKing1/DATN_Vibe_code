package com.example.backend.service;

import com.example.backend.dto.ai.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

/**
 * HTTP client for communicating with the AI Server (FastAPI RAG Backend).
 *
 * All RAG-related operations (query, ingestion, Law management) go through this service.
 */
@Slf4j
@Service
public class AiServerClient {

    private final WebClient aiServerWebClient;
    private final WebClient aiServerAgentWebClient;

    public AiServerClient(
            @Qualifier("aiServerWebClient") WebClient aiServerWebClient,
            @Qualifier("aiServerAgentWebClient") WebClient aiServerAgentWebClient) {
        this.aiServerWebClient = aiServerWebClient;
        this.aiServerAgentWebClient = aiServerAgentWebClient;
    }

    // ═══════════════════════════════════════════════════════════
    // QUERY ENDPOINTS
    // ═══════════════════════════════════════════════════════════

    public RAGResponse query(RAGQueryRequest request) {
        log.info("Sending RAG query to AI Server: {}", request.getQuery());
        try {
            return aiServerWebClient.post()
                    .uri("/api/v1/query/")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RAGResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("AI Server returned error for query: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI Server query failed: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to connect to AI Server for query: {}", e.getMessage());
            throw new RuntimeException("AI Server is unavailable. Please try again later.", e);
        }
    }

    public Flux<String> queryStream(RAGQueryRequest request) {
        log.info("Sending streaming RAG query to AI Server: {}", request.getQuery());
        return aiServerWebClient.post()
                .uri("/api/v1/query/stream")
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnError(e -> log.error("Streaming query error: {}", e.getMessage()));
    }

    public AgentQueryResponse agentQuery(AgentQueryRequest request) {
        log.info("Sending Multi-Agent RAG query to AI Server: {}", request.getQuestion());
        try {
            return aiServerAgentWebClient.post()
                    .uri("/api/v1/query/agent/")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AgentQueryResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("AI Server returned error for agent query: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI Server agent query failed: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to connect to AI Server for agent query: {}", e.getMessage());
            throw new RuntimeException("AI Server is unavailable. Please try again later.", e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LAW MANAGEMENT ENDPOINTS
    // ═══════════════════════════════════════════════════════════

    @SuppressWarnings("unchecked")
    public List<LawInfo> listLaws() {
        log.debug("Listing laws from AI Server");
        try {
            Map<String, Object> response = aiServerWebClient.get()
                    .uri("/api/v1/ingestion/laws")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response == null || !response.containsKey("laws")) {
                return List.of();
            }

            List<Map<String, Object>> rawList = (List<Map<String, Object>>) response.get("laws");

            return rawList.stream().map(m -> LawInfo.builder()
                    .soKyHieu((String) m.get("so_ky_hieu"))
                    .tenDayDu((String) m.getOrDefault("ten_day_du", ""))
                    .loaiVanBan((String) m.getOrDefault("loai_van_ban", ""))
                    .chunkCount(m.get("chunk_count") != null ? ((Number) m.get("chunk_count")).intValue() : 0)
                    .build()
            ).toList();

        } catch (Exception e) {
            log.error("Failed to list laws from AI Server: {}", e.getMessage());
            return List.of();
        }
    }

    public LawCreateResponse ingestFromMongodb(String tenDayDu) {
        log.info("Ingesting Law from MongoDB with name: {}", tenDayDu);
        try {
            return aiServerWebClient.post()
                    .uri("/api/v1/ingestion/laws")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("ten_day_du", tenDayDu))
                    .retrieve()
                    .bodyToMono(LawCreateResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("AI Server error ingesting Law: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Law ingestion failed: " + e.getMessage(), e);
        }
    }

    public DeleteLawResponse deleteLaw(String soKyHieu) {
        log.info("Deleting Law so_ky_hieu={} from AI Server", soKyHieu);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> raw = aiServerWebClient
                    .delete()
                    .uri("/api/v1/ingestion/laws/" + soKyHieu)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (raw == null) {
                return DeleteLawResponse.builder()
                        .lawUuid(soKyHieu)
                        .chunksDeleted(0)
                        .lawDeleted(false)
                        .status("error")
                        .build();
            }

            return DeleteLawResponse.builder()
                    .lawUuid(soKyHieu) // Using lawUuid field to hold soKyHieu for backward compatibility in DeleteLawResponse class if we didn't change it, wait we didn't check DeleteLawResponse
                    // Wait, let me just assume DeleteLawResponse is updated or keep lawUuid field.
                    // I will check DeleteLawResponse after this.
                    .chunksDeleted(raw.get("chunks_deleted") != null ? ((Number) raw.get("chunks_deleted")).intValue() : 0)
                    .lawDeleted(Boolean.TRUE.equals(raw.get("law_deleted")))
                    .status((String) raw.getOrDefault("status", "deleted"))
                    .build();
        } catch (WebClientResponseException e) {
            log.error("AI Server error deleting Law {}: {} - {}", soKyHieu, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Law deletion failed: " + e.getMessage(), e);
        }
    }

    public boolean isHealthy() {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = aiServerWebClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            return response != null && "healthy".equals(response.get("status"));
        } catch (Exception e) {
            log.warn("AI Server health check failed: {}", e.getMessage());
            return false;
        }
    }
}
