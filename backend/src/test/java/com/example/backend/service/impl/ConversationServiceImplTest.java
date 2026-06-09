package com.example.backend.service.impl;

import com.example.backend.dto.request.ConversationRequest;
import com.example.backend.entity.Conversation;
import com.example.backend.entity.Message;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationServiceImplTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @InjectMocks
    private ConversationServiceImpl conversationService;

    private Conversation sampleConversation;

    @BeforeEach
    void setUp() {
        sampleConversation = Conversation.builder()
                .id("conv1")
                .userId("user1")
                .title("Sample Chat")
                .build();
    }

    @Test
    void getUserConversations_ShouldCallRepository() {
        when(conversationRepository.findByUserIdOrderByUpdatedAtDesc("user1"))
                .thenReturn(List.of(sampleConversation));

        List<Conversation> result = conversationService.getUserConversations("user1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("conv1");
        verify(conversationRepository).findByUserIdOrderByUpdatedAtDesc("user1");
    }

    @Test
    void createConversation_ShouldBuildAndSave() {
        ConversationRequest req = new ConversationRequest();
        req.setTitle("New Chat");

        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleConversation);

        Conversation result = conversationService.createConversation("user1", req);

        assertThat(result).isNotNull();
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    void updateConversation_WhenValidOwner_ShouldUpdateTitleAndSave() {
        ConversationRequest req = new ConversationRequest();
        req.setTitle("Updated Title");

        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));
        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleConversation);

        Conversation result = conversationService.updateConversation("conv1", "user1", req);

        assertThat(result.getTitle()).isEqualTo("Updated Title");
        verify(conversationRepository).save(sampleConversation);
    }

    @Test
    void updateConversation_WhenInvalidOwner_ShouldThrowUnauthorizedException() {
        ConversationRequest req = new ConversationRequest();
        req.setTitle("Updated Title");

        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));

        assertThatThrownBy(() -> conversationService.updateConversation("conv1", "user2", req))
                .isInstanceOf(UnauthorizedException.class);
        
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void deleteConversation_WhenValidOwner_ShouldDeleteMessagesAndConversation() {
        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));

        conversationService.deleteConversation("conv1", "user1");

        verify(messageRepository).deleteByConversationId("conv1");
        verify(conversationRepository).delete(sampleConversation);
    }

    @Test
    void getConversationMessages_ShouldCallMessageRepository() {
        Message msg = Message.builder().id("msg1").conversationId("conv1").content("Hello").build();
        when(conversationRepository.findById("conv1")).thenReturn(Optional.of(sampleConversation));
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc("conv1"))
                .thenReturn(List.of(msg));

        List<Message> result = conversationService.getConversationMessages("conv1", "user1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getContent()).isEqualTo("Hello");
        verify(messageRepository).findByConversationIdOrderByCreatedAtAsc("conv1");
    }

    @Test
    void updateConversation_WhenNotFound_ShouldThrowResourceNotFoundException() {
        ConversationRequest req = new ConversationRequest();
        when(conversationRepository.findById("invalid")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> conversationService.updateConversation("invalid", "user1", req))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
