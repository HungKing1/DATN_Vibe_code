package com.example.backend.service;

import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.User;

public interface UserService {
    UserResponse getCurrentUser(String userId);
    UserResponse updateSettings(String userId, User.Settings settings);
}
