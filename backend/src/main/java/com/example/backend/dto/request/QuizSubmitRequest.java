package com.example.backend.dto.request;

import lombok.Data;

import java.util.Map;

@Data
public class QuizSubmitRequest {
    private Map<String, Integer> answers; // Question ID -> Selected Option Index
}
