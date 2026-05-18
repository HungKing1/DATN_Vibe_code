package com.example.backend.controller;

import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<User.Progress> getProgress(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        return ApiResponse.success(user.getProgress());
    }

    @PutMapping
    public ApiResponse<User.Progress> updateProgress(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                     @RequestBody User.Progress progress) {
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        user.setProgress(progress);
        userRepository.save(user);
        return ApiResponse.success(user.getProgress());
    }
}
