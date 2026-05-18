package com.example.backend.controller;

import com.example.backend.dto.ai.RAGQueryRequest;
import com.example.backend.dto.ai.RAGResponse;
import com.example.backend.dto.request.SearchRequest;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.dto.response.SearchResponse;
import com.example.backend.entity.Message;
import com.example.backend.service.AiServerClient;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final AiServerClient aiServerClient;

    @PostMapping
    public ApiResponse<SearchResponse> search(@Valid @RequestBody SearchRequest request) {
        log.info("Search request: query='{}', topK={}", request.getQuery(), request.getTopK());

        RAGQueryRequest ragRequest = RAGQueryRequest.builder()
                .query(request.getQuery())
                .topK(request.getTopK())
                .useReranker(true)
                .useQueryRewrite(true)
                .build();

        RAGResponse ragResponse = aiServerClient.query(ragRequest);

        // Convert RAG citations to Message.Citation format
        List<Message.Citation> citations = ragResponse.getCitations() != null
                ? ragResponse.getCitations().stream()
                    .map(c -> Message.Citation.builder()
                            .lawName(c.getSource())
                            .text(c.getContentSnippet())
                            .similarityScore(c.getRelevanceScore())
                            .build())
                    .collect(Collectors.toList())
                : List.of();

        SearchResponse response = SearchResponse.builder()
                .answer(ragResponse.getAnswer())
                .citations(citations)
                .build();

        return ApiResponse.success(response);
    }
}
