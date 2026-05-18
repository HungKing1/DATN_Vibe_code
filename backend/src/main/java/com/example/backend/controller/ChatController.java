package com.example.backend.controller;

import com.example.backend.dto.request.ChatRequest;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.Message;
import com.example.backend.security.CustomUserDetails;
import com.example.backend.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ApiResponse<Message> chat(@AuthenticationPrincipal CustomUserDetails userDetails,
                                     @Valid @RequestBody ChatRequest request) {
        return ApiResponse.success(chatService.processChat(userDetails.getId(), request));
    }
}
