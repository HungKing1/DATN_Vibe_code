package com.example.backend.service;

import com.example.backend.dto.request.ConversationRequest;
import com.example.backend.entity.Message;
import com.example.backend.entity.Conversation;

import java.util.List;

public interface ConversationService {
    List<Conversation> getUserConversations(String userId);
    Conversation createConversation(String userId, ConversationRequest request);
    Conversation updateConversation(String conversationId, String userId, ConversationRequest request);
    void deleteConversation(String conversationId, String userId);
    
    List<Message> getConversationMessages(String conversationId, String userId);
    void deleteConversationMessages(String conversationId, String userId);
    List<String> getSuggestions(String conversationId, String userId);
}
