package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConversationRequest {
    @NotBlank(message = "Title is required")
    private String title;

}
