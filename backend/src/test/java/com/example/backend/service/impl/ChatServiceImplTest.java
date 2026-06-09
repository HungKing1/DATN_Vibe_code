package com.example.backend.service.impl;

import com.example.backend.dto.ai.AgentQueryRequest;
import com.example.backend.dto.ai.AgentQueryResponse;
import com.example.backend.dto.request.ChatRequest;
import com.example.backend.entity.Conversation;
import com.example.backend.entity.Message;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.MessageRepository;
import com.example.backend.service.AiServerClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private AiServerClient aiServerClient;

    @InjectMocks
    private ChatServiceImpl chatService;

    private Conversation sampleConversation;

    @BeforeEach
    void setUp() {
        sampleConversation = Conversation.builder()
                .id("conv1")
                .userId("user1")
                .title("New Conversation")
                .messageCount(0)
                .build();
    }

    @Test
    void processChat_WithNullConversationId_ShouldCreateConversationAndSaveMessages() {
        ChatRequest request = new ChatRequest();
        request.setContent("What is law?");

        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleConversation);
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArguments()[0]);
        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));
        
        AgentQueryResponse aiResponse = new AgentQueryResponse();
        aiResponse.setAnswer("Law is rules.");
        aiResponse.setIterations(1);
        when(aiServerClient.agentQuery(any())).thenReturn(aiResponse);

        Message responseMsg = chatService.processChat("user1", request);

        assertThat(responseMsg).isNotNull();
        assertThat(responseMsg.getRole()).isEqualTo("ai");
        assertThat(responseMsg.getContent()).isEqualTo("Law is rules.");
        verify(conversationRepository, times(2)).save(any(Conversation.class)); // 1 for create, 1 for update stats
        verify(messageRepository, times(2)).save(any(Message.class)); // 1 user, 1 ai
    }

    @Test
    void processChat_WithExistingConversationId_ShouldNotCreateNewConversation() {
        ChatRequest request = new ChatRequest();
        request.setConversationId("conv1");
        request.setContent("What is law?");

        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArguments()[0]);
        
        AgentQueryResponse aiResponse = new AgentQueryResponse();
        aiResponse.setAnswer("Law is rules.");
        aiResponse.setIterations(1);
        when(aiServerClient.agentQuery(any())).thenReturn(aiResponse);

        chatService.processChat("user1", request);

        verify(conversationRepository, times(2)).findById("conv1"); // once at start, once at end
        verify(conversationRepository, times(1)).save(any(Conversation.class)); // Update stats calls save
    }

    @Test
    void processChat_WithInvalidConversationId_ShouldThrowException() {
        ChatRequest request = new ChatRequest();
        request.setConversationId("invalid");
        request.setContent("test");

        when(conversationRepository.findById("invalid")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.processChat("user1", request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void processChat_WhenAiServerThrowsException_ShouldReturnFallbackMessage() {
        ChatRequest request = new ChatRequest();
        request.setContent("What is law?");

        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleConversation);
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArguments()[0]);
        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));

        when(aiServerClient.agentQuery(any())).thenThrow(new RuntimeException("Connection error"));

        Message responseMsg = chatService.processChat("user1", request);

        assertThat(responseMsg.getContent()).contains("⚠️ Hệ thống AI tạm thời không khả dụng");
    }

    @Test
    void processChat_WhenAiServerReturnsNullAnswer_ShouldReturnDefaultMessage() {
        ChatRequest request = new ChatRequest();
        request.setContent("What is law?");

        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleConversation);
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArguments()[0]);
        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));
        
        AgentQueryResponse aiResponse = new AgentQueryResponse();
        aiResponse.setAnswer(null); // null answer
        when(aiServerClient.agentQuery(any())).thenReturn(aiResponse);

        Message responseMsg = chatService.processChat("user1", request);

        assertThat(responseMsg.getContent()).isEqualTo("Không tìm thấy thông tin phù hợp trong cơ sở dữ liệu luật.");
    }

    @Test
    void processChat_ShouldUpdateMessageCount() {
        ChatRequest request = new ChatRequest();
        request.setConversationId("conv1");
        request.setContent("test");

        sampleConversation.setMessageCount(5);
        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArguments()[0]);
        
        AgentQueryResponse aiResponse = new AgentQueryResponse();
        aiResponse.setAnswer("Law is rules.");
        when(aiServerClient.agentQuery(any())).thenReturn(aiResponse);

        chatService.processChat("user1", request);

        assertThat(sampleConversation.getMessageCount()).isEqualTo(7); // +2
        verify(conversationRepository).save(sampleConversation);
    }
}
