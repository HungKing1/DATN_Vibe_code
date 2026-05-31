package com.example.backend.service.impl;

import com.example.backend.dto.request.ConversationRequest;
import com.example.backend.entity.Message;
import com.example.backend.entity.Conversation;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    @Override
    public List<Conversation> getUserConversations(String userId) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Override
    public Conversation createConversation(String userId, ConversationRequest request) {
        Conversation conversation = Conversation.builder()
                .userId(userId)
                .title(request.getTitle())

                .build();
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation updateConversation(String conversationId, String userId, ConversationRequest request) {
        Conversation conversation = getConversationAndVerifyOwner(conversationId, userId);
        conversation.setTitle(request.getTitle());

        return conversationRepository.save(conversation);
    }

    @Override
    public void deleteConversation(String conversationId, String userId) {
        Conversation conversation = getConversationAndVerifyOwner(conversationId, userId);
        messageRepository.deleteByConversationId(conversationId); // Delete all messages
        conversationRepository.delete(conversation);
    }

    @Override
    public List<Message> getConversationMessages(String conversationId, String userId) {
        getConversationAndVerifyOwner(conversationId, userId);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    @Override
    public void deleteConversationMessages(String conversationId, String userId) {
        Conversation conversation = getConversationAndVerifyOwner(conversationId, userId);
        messageRepository.deleteByConversationId(conversationId);
        conversation.setMessageCount(0);
        conversationRepository.save(conversation);
    }

    @Override
    public List<String> getSuggestions(String conversationId, String userId) {
        getConversationAndVerifyOwner(conversationId, userId);
        return messageRepository.findFirstByConversationIdAndRoleOrderByCreatedAtDesc(conversationId, "ai")
                .map(Message::getSuggestedQuestions)
                .orElse(List.of("Tôi có thể hỏi thêm về vấn đề gì?", "Quy định này áp dụng cho đối tượng nào?"));
    }

    private Conversation getConversationAndVerifyOwner(String conversationId, String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        if (!conversation.getUserId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to access this conversation");
        }
        return conversation;
    }
}
