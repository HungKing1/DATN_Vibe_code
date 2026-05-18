package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FlashcardRequest {
    @NotBlank(message = "Front is required")
    private String front;

    @NotBlank(message = "Back is required")
    private String back;

    @NotBlank(message = "Clause ID is required")
    private String clauseId;

    private String topicId;
}
