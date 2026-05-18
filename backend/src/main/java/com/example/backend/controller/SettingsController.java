package com.example.backend.controller;

import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<User.Settings> getSettings(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        return ApiResponse.success(user.getSettings());
    }

    @PutMapping
    public ApiResponse<User.Settings> updateSettings(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                     @RequestBody User.Settings settings) {
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        user.setSettings(settings);
        userRepository.save(user);
        return ApiResponse.success(user.getSettings());
    }
}
