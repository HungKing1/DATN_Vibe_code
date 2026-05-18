package com.example.backend.mapper;

import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.User;

public class UserMapper {

    public static UserResponse toDto(User user) {
        if (user == null) return null;

        UserResponse.ProgressDto progressDto = null;
        if (user.getProgress() != null) {
            progressDto = UserResponse.ProgressDto.builder()
                    .lawsLearned(user.getProgress().getLawsLearned())
                    .flashcardsCompleted(user.getProgress().getFlashcardsCompleted())
                    .quizzesCompleted(user.getProgress().getQuizzesCompleted())
                    .build();
        }

        UserResponse.SettingsDto settingsDto = null;
        if (user.getSettings() != null) {
            settingsDto = UserResponse.SettingsDto.builder()
                    .aiModel(user.getSettings().getAiModel())
                    .compactMode(user.getSettings().isCompactMode())
                    .build();
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .progress(progressDto)
                .settings(settingsDto)
                .build();
    }
}
