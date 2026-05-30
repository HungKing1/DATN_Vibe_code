package com.example.backend.mapper;

import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.User;

public class UserMapper {

    public static UserResponse toDto(User user) {
        if (user == null) return null;


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

                .settings(settingsDto)
                .build();
    }
}
