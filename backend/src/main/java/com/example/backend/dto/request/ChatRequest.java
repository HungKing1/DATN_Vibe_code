package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatRequest {
    @NotBlank(message = "Content is required")
    private String content;
    
    private String notebookId; // If null, create new
}
