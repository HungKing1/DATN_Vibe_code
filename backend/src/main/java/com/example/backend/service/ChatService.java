package com.example.backend.service;

import com.example.backend.dto.request.ChatRequest;
import com.example.backend.entity.Message;

public interface ChatService {
    Message processChat(String userId, ChatRequest request);
}
