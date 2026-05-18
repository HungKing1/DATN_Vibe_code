package com.example.backend.controller;

import com.example.backend.dto.request.FlashcardRequest;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.Flashcard;
import com.example.backend.repository.FlashcardRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/flashcards")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardRepository flashcardRepository;

    @GetMapping
    public ApiResponse<List<Flashcard>> getFlashcards() {
        return ApiResponse.success(flashcardRepository.findAll());
    }

    @PostMapping
    public ApiResponse<Flashcard> createFlashcard(@Valid @RequestBody FlashcardRequest request) {
        Flashcard flashcard = Flashcard.builder()
                .front(request.getFront())
                .back(request.getBack())
                .clauseId(request.getClauseId())
                .topicId(request.getTopicId())
                .build();
        return ApiResponse.success(flashcardRepository.save(flashcard));
    }

    @PutMapping("/{id}")
    public ApiResponse<Flashcard> updateFlashcard(@PathVariable String id, @Valid @RequestBody FlashcardRequest request) {
        Flashcard flashcard = flashcardRepository.findById(id).orElseThrow();
        flashcard.setFront(request.getFront());
        flashcard.setBack(request.getBack());
        flashcard.setClauseId(request.getClauseId());
        flashcard.setTopicId(request.getTopicId());
        return ApiResponse.success(flashcardRepository.save(flashcard));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteFlashcard(@PathVariable String id) {
        flashcardRepository.deleteById(id);
        return ApiResponse.success("Deleted successfully");
    }
}
