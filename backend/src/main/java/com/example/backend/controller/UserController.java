package com.example.backend.controller;

import com.example.backend.dto.response.ApiResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.User;
import com.example.backend.security.CustomUserDetails;
import com.example.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(userService.getCurrentUser(userDetails.getId()));
    }

    @PutMapping("/me/settings")
    public ApiResponse<UserResponse> updateSettings(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                    @RequestBody User.Settings settings) {
        return ApiResponse.success(userService.updateSettings(userDetails.getId(), settings));
    }
}
