package com.example.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private String id;
    private String email;
    private String role;

    private SettingsDto settings;


    @Data
    @Builder
    public static class SettingsDto {
        private String aiModel;
        private boolean compactMode;
    }
}
