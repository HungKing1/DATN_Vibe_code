package com.example.backend.controller;

import com.example.backend.dto.request.ConversationRequest;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.Message;
import com.example.backend.entity.Conversation;
import com.example.backend.security.CustomUserDetails;
import com.example.backend.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @GetMapping
    public ApiResponse<List<Conversation>> getConversations(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(conversationService.getUserConversations(userDetails.getId()));
    }

    @PostMapping
    public ApiResponse<Conversation> createConversation(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                @Valid @RequestBody ConversationRequest request) {
        return ApiResponse.success(conversationService.createConversation(userDetails.getId(), request));
    }

    @PutMapping("/{id}")
    public ApiResponse<Conversation> updateConversation(@PathVariable String id,
                                                @AuthenticationPrincipal CustomUserDetails userDetails,
                                                @Valid @RequestBody ConversationRequest request) {
        return ApiResponse.success(conversationService.updateConversation(id, userDetails.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteConversation(@PathVariable String id,
                                              @AuthenticationPrincipal CustomUserDetails userDetails) {
        conversationService.deleteConversation(id, userDetails.getId());
        return ApiResponse.success("Conversation deleted");
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<Message>> getMessages(@PathVariable String id,
                                                  @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(conversationService.getConversationMessages(id, userDetails.getId()));
    }

    @DeleteMapping("/{id}/messages")
    public ApiResponse<String> deleteMessages(@PathVariable String id,
                                              @AuthenticationPrincipal CustomUserDetails userDetails) {
        conversationService.deleteConversationMessages(id, userDetails.getId());
        return ApiResponse.success("Messages deleted");
    }

    @GetMapping("/{id}/suggestions")
    public ApiResponse<List<String>> getSuggestions(@PathVariable String id,
                                                    @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(conversationService.getSuggestions(id, userDetails.getId()));
    }
}
