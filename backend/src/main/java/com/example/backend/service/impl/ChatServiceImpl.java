package com.example.backend.service.impl;

import com.example.backend.dto.ai.RAGQueryRequest;
import com.example.backend.dto.ai.RAGResponse;
import com.example.backend.dto.request.ChatRequest;
import com.example.backend.entity.Message;
import com.example.backend.entity.Notebook;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.NotebookRepository;
import com.example.backend.service.AiServerClient;
import com.example.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final MessageRepository messageRepository;
    private final NotebookRepository notebookRepository;
    private final AiServerClient aiServerClient;

    @Override
    public Message processChat(String userId, ChatRequest request) {
        String notebookId = request.getNotebookId();
        Notebook notebook;

        if (notebookId == null || notebookId.isEmpty()) {
            notebook = Notebook.builder()
                    .userId(userId)
                    .title("New Chat")
                    .build();
            notebook = notebookRepository.save(notebook);
            notebookId = notebook.getId();
        } else {
            notebook = notebookRepository.findById(notebookId)
                    .orElseThrow(() -> new IllegalArgumentException("Notebook not found"));
        }

        // Save User Message
        Message userMessage = Message.builder()
                .notebookId(notebookId)
                .role("user")
                .content(request.getContent())
                .build();
        messageRepository.save(userMessage);

        // Call AI Server for real RAG response
        Message aiMessage;
        try {
            RAGQueryRequest ragRequest = RAGQueryRequest.builder()
                    .query(request.getContent())
                    .useReranker(true)
                    .useQueryRewrite(true)
                    .build();

            RAGResponse ragResponse = aiServerClient.query(ragRequest);

            // Convert RAG citations to Message citations
            List<Message.Citation> citations = ragResponse.getCitations() != null
                    ? ragResponse.getCitations().stream()
                        .map(c -> Message.Citation.builder()
                                .lawName(c.getSource())
                                .text(c.getContentSnippet())
                                .similarityScore(c.getRelevanceScore())
                                .build())
                        .collect(Collectors.toList())
                    : List.of();

            aiMessage = Message.builder()
                    .notebookId(notebookId)
                    .role("ai")
                    .content(ragResponse.getAnswer())
                    .citations(citations)
                    .confidence(ragResponse.getCitations() != null && !ragResponse.getCitations().isEmpty()
                            ? ragResponse.getCitations().stream()
                                .mapToDouble(RAGResponse.RAGCitation::getRelevanceScore)
                                .average()
                                .orElse(0.0)
                            : null)
                    .suggestedQuestions(List.of(
                            "Bạn có thể giải thích thêm không?",
                            "Có điều luật nào liên quan khác không?"))
                    .build();

            log.info("AI response generated via RAG pipeline for notebook: {}", notebookId);

        } catch (Exception e) {
            // Fallback when AI Server is unavailable
            log.error("AI Server unavailable, returning fallback response: {}", e.getMessage());
            aiMessage = Message.builder()
                    .notebookId(notebookId)
                    .role("ai")
                    .content("⚠️ Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.\n\n"
                            + "Câu hỏi của bạn: \"" + request.getContent() + "\"")
                    .confidence(0.0)
                    .suggestedQuestions(List.of("Thử lại câu hỏi"))
                    .build();
        }

        aiMessage = messageRepository.save(aiMessage);

        // Update Notebook
        notebook.setMessageCount(notebook.getMessageCount() + 2);
        notebookRepository.save(notebook);

        return aiMessage;
    }
}
