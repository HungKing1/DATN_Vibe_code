package com.example.backend.controller;

import com.example.backend.dto.request.QuizSubmitRequest;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.QuizQuestion;
import com.example.backend.repository.QuizQuestionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizQuestionRepository quizQuestionRepository;

    @GetMapping
    public ApiResponse<List<QuizQuestion>> getQuizzes() {
        return ApiResponse.success(quizQuestionRepository.findAll());
    }

    @PostMapping("/submit")
    public ApiResponse<String> submitQuiz(@Valid @RequestBody QuizSubmitRequest request) {
        // Dummy logic to process score
        int score = 0;
        return ApiResponse.success("Quiz submitted. Score: " + score);
    }
}
