package com.example.backend.controller;

import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.Clause;
import com.example.backend.entity.Law;
import com.example.backend.entity.LegalTopic;
import com.example.backend.service.LegalDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class LegalDataController {

    private final LegalDataService legalDataService;

    @GetMapping("/laws")
    public ApiResponse<List<Law>> getLaws() {
        return ApiResponse.success(legalDataService.getLaws());
    }

    @GetMapping("/topics")
    public ApiResponse<List<LegalTopic>> getTopics() {
        return ApiResponse.success(legalDataService.getTopics());
    }

    @GetMapping("/laws/{id}/clauses")
    public ApiResponse<List<Clause>> getClausesByLaw(@PathVariable String id) {
        return ApiResponse.success(legalDataService.getClausesByLaw(id));
    }

    @GetMapping("/clauses/{id}")
    public ApiResponse<Clause> getClause(@PathVariable String id) {
        return ApiResponse.success(legalDataService.getClause(id));
    }
}
