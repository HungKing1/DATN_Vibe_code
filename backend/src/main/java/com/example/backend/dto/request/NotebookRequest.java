package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NotebookRequest {
    @NotBlank(message = "Title is required")
    private String title;
    
    private String emoji;
    private String color;
}
