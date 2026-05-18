package com.example.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private String id;
    private String email;
    private String role;
    private ProgressDto progress;
    private SettingsDto settings;

    @Data
    @Builder
    public static class ProgressDto {
        private int lawsLearned;
        private int flashcardsCompleted;
        private int quizzesCompleted;
    }

    @Data
    @Builder
    public static class SettingsDto {
        private String aiModel;
        private boolean compactMode;
    }
}
