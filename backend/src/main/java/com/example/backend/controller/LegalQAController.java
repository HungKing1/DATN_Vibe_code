package com.example.backend.controller;

import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.LegalQA;
import com.example.backend.service.LegalQAService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/legal-qa")
@RequiredArgsConstructor
public class LegalQAController {
    private final LegalQAService legalQAService;

    @GetMapping
    public ApiResponse<List<LegalQA>> getLegalQA(@RequestParam(name = "soKyHieu") String soKyHieu) {
        return ApiResponse.success(legalQAService.getLegalQABySoKyHieu(soKyHieu));
    }
}
