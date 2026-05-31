package com.example.backend.service.impl;

import com.example.backend.dto.ai.AgentQueryRequest;
import com.example.backend.dto.ai.AgentQueryResponse;
import com.example.backend.dto.ai.RAGQueryRequest;
import com.example.backend.dto.ai.RAGResponse;
import com.example.backend.dto.request.ChatRequest;
import com.example.backend.entity.Message;
import com.example.backend.entity.Conversation;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.ConversationRepository;
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
    private final ConversationRepository conversationRepository;
    private final AiServerClient aiServerClient;

    @Override
    public Message processChat(String userId, ChatRequest request) {
        String conversationId = request.getConversationId();
        Conversation conversation;

        if (conversationId == null || conversationId.isEmpty()) {
            conversation = Conversation.builder()
                    .userId(userId)
                    .title("New Chat")
                    .build();
            conversation = conversationRepository.save(conversation);
            conversationId = conversation.getId();
        } else {
            conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        }

        // Save User Message
        Message userMessage = Message.builder()
                .conversationId(conversationId)
                .role("user")
                .content(request.getContent())
                .build();
        messageRepository.save(userMessage);

        // Route to correct AI Server pipeline based on mode
        boolean isAgentMode = "agent".equalsIgnoreCase(request.getMode());
        Message aiMessage = isAgentMode
                ? processAgentQuery(conversationId, request.getContent())
                : processQuickQuery(conversationId, request.getContent());

        aiMessage = messageRepository.save(aiMessage);

        // Update Conversation message count
        conversation.setMessageCount(conversation.getMessageCount() + 2);
        conversationRepository.save(conversation);

        return aiMessage;
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Standard RAG pipeline — calls POST /api/v1/query/ on AI Server.
     * Fast response: Query Rewrite → Hybrid Search → Rerank → LLM Generate.
     */
    private Message processQuickQuery(String conversationId, String content) {
        try {
            RAGQueryRequest ragRequest = RAGQueryRequest.builder()
                    .query(content)
                    .useReranker(true)
                    .useQueryRewrite(true)
                    .build();

            RAGResponse ragResponse = aiServerClient.query(ragRequest);

            List<Message.Citation> citations = ragResponse.getCitations() != null
                    ? ragResponse.getCitations().stream()
                        .map(c -> Message.Citation.builder()
                                .lawName(c.getSource())
                                .text(c.getContentSnippet())
                                .similarityScore(c.getRelevanceScore())
                                .build())
                        .collect(Collectors.toList())
                    : List.of();

            Double confidence = ragResponse.getCitations() != null && !ragResponse.getCitations().isEmpty()
                    ? ragResponse.getCitations().stream()
                        .mapToDouble(RAGResponse.RAGCitation::getRelevanceScore)
                        .average()
                        .orElse(0.0)
                    : null;

            log.info("Quick RAG response generated for conversation: {}", conversationId);
            return Message.builder()
                    .conversationId(conversationId)
                    .role("ai")
                    .content(ragResponse.getAnswer())
                    .citations(citations)
                    .confidence(confidence)
                    .suggestedQuestions(List.of(
                            "Bạn có thể giải thích thêm không?",
                            "Có điều luật nào liên quan khác không?"))
                    .build();

        } catch (Exception e) {
            log.error("AI Server unavailable (quick mode), returning fallback: {}", e.getMessage());
            return buildFallbackMessage(conversationId, content);
        }
    }

    /**
     * Multi-Agent RAG pipeline — calls POST /api/v1/query/agent on AI Server.
     * Deep reasoning: MasterLawyerAgent → parallel ParalegalAgents → synthesize.
     */
    private Message processAgentQuery(String conversationId, String content) {
        try {
            AgentQueryRequest agentRequest = AgentQueryRequest.builder()
                    .question(content)   // AI Server field is "question", not "query"
                    .build();

            AgentQueryResponse agentResponse = aiServerClient.agentQuery(agentRequest);

            log.info("Multi-Agent RAG response generated for conversation: {}, iterations: {}",
                    conversationId, agentResponse != null ? agentResponse.getIterations() : 0);

            String answer = agentResponse != null ? agentResponse.getAnswer() : null;
            if (answer == null || answer.isBlank()) {
                answer = "Không tìm thấy thông tin phù hợp trong cơ sở dữ liệu luật.";
            }

            return Message.builder()
                    .conversationId(conversationId)
                    .role("ai")
                    .content(answer)
                    .citations(List.of()) // Agent mode trả về raw text, không có structured citations
                    .confidence(null)
                    .suggestedQuestions(List.of(
                            "Phân tích thêm chi tiết điều luật này?",
                            "Có trường hợp ngoại lệ nào không?",
                            "Mức xử phạt cụ thể là gì?"))
                    .build();

        } catch (Exception e) {
            log.error("AI Server unavailable (agent mode), returning fallback: {}", e.getMessage());
            return buildFallbackMessage(conversationId, content);
        }
    }

    private Message buildFallbackMessage(String conversationId, String content) {
        return Message.builder()
                .conversationId(conversationId)
                .role("ai")
                .content("⚠️ Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.\n\n"
                        + "Câu hỏi của bạn: \"" + content + "\"")
                .confidence(0.0)
                .suggestedQuestions(List.of("Thử lại câu hỏi"))
                .build();
    }
}

