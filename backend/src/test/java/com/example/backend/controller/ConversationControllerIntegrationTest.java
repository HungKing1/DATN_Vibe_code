package com.example.backend.controller;

import com.example.backend.dto.request.ConversationRequest;
import com.example.backend.entity.Conversation;
import com.example.backend.entity.User;
import com.example.backend.security.CustomUserDetails;
import com.example.backend.service.ConversationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ConversationControllerIntegrationTest {

    private MockMvc mockMvc;

    @Mock
    private ConversationService conversationService;

    @InjectMocks
    private ConversationController conversationController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // Setup CustomUserDetails for @AuthenticationPrincipal
        HandlerMethodArgumentResolver authenticationPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(CustomUserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                User u = new User();
                u.setId("user1");
                u.setEmail("user@test.com");
                return new CustomUserDetails(u);
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(conversationController)
                .setCustomArgumentResolvers(authenticationPrincipalResolver)
                .build();
    }

    @Test
    void testGetConversations() throws Exception {
        Conversation conv = Conversation.builder().id("c1").title("Chat 1").build();
        when(conversationService.getUserConversations("user1")).thenReturn(List.of(conv));

        mockMvc.perform(get("/api/v1/conversations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data[0].id").value("c1"));
    }

    @Test
    void testCreateConversation() throws Exception {
        ConversationRequest req = new ConversationRequest();
        req.setTitle("New Chat");

        Conversation conv = Conversation.builder().id("c1").title("New Chat").build();
        when(conversationService.createConversation(eq("user1"), any())).thenReturn(conv);

        mockMvc.perform(post("/api/v1/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.title").value("New Chat"));
    }

    @Test
    void testUpdateConversation() throws Exception {
        ConversationRequest req = new ConversationRequest();
        req.setTitle("Updated Title");

        Conversation conv = Conversation.builder().id("c1").title("Updated Title").build();
        when(conversationService.updateConversation(eq("c1"), eq("user1"), any())).thenReturn(conv);

        mockMvc.perform(put("/api/v1/conversations/c1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.title").value("Updated Title"));
    }

    @Test
    void testDeleteConversation() throws Exception {
        mockMvc.perform(delete("/api/v1/conversations/c1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        verify(conversationService).deleteConversation("c1", "user1");
    }

    @Test
    void testGetConversationMessages() throws Exception {
        mockMvc.perform(get("/api/v1/conversations/c1/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        verify(conversationService).getConversationMessages("c1", "user1");
    }
}
