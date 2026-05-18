package com.example.backend.service.impl;

import com.example.backend.dto.request.NotebookRequest;
import com.example.backend.entity.Message;
import com.example.backend.entity.Notebook;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.NotebookRepository;
import com.example.backend.service.NotebookService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotebookServiceImpl implements NotebookService {

    private final NotebookRepository notebookRepository;
    private final MessageRepository messageRepository;

    @Override
    public List<Notebook> getUserNotebooks(String userId) {
        return notebookRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Override
    public Notebook createNotebook(String userId, NotebookRequest request) {
        Notebook notebook = Notebook.builder()
                .userId(userId)
                .title(request.getTitle())
                .emoji(request.getEmoji() != null ? request.getEmoji() : "⚖️")
                .color(request.getColor() != null ? request.getColor() : "blue")
                .build();
        return notebookRepository.save(notebook);
    }

    @Override
    public Notebook updateNotebook(String notebookId, String userId, NotebookRequest request) {
        Notebook notebook = getNotebookAndVerifyOwner(notebookId, userId);
        notebook.setTitle(request.getTitle());
        if (request.getEmoji() != null) notebook.setEmoji(request.getEmoji());
        if (request.getColor() != null) notebook.setColor(request.getColor());
        return notebookRepository.save(notebook);
    }

    @Override
    public void deleteNotebook(String notebookId, String userId) {
        Notebook notebook = getNotebookAndVerifyOwner(notebookId, userId);
        messageRepository.deleteByNotebookId(notebookId); // Delete all messages
        notebookRepository.delete(notebook);
    }

    @Override
    public List<Message> getNotebookMessages(String notebookId, String userId) {
        getNotebookAndVerifyOwner(notebookId, userId);
        return messageRepository.findByNotebookIdOrderByCreatedAtAsc(notebookId);
    }

    @Override
    public void deleteNotebookMessages(String notebookId, String userId) {
        Notebook notebook = getNotebookAndVerifyOwner(notebookId, userId);
        messageRepository.deleteByNotebookId(notebookId);
        notebook.setMessageCount(0);
        notebookRepository.save(notebook);
    }

    @Override
    public List<String> getSuggestions(String notebookId, String userId) {
        getNotebookAndVerifyOwner(notebookId, userId);
        return messageRepository.findFirstByNotebookIdAndRoleOrderByCreatedAtDesc(notebookId, "ai")
                .map(Message::getSuggestedQuestions)
                .orElse(List.of("Tôi có thể hỏi thêm về vấn đề gì?", "Quy định này áp dụng cho đối tượng nào?"));
    }

    private Notebook getNotebookAndVerifyOwner(String notebookId, String userId) {
        Notebook notebook = notebookRepository.findById(notebookId)
                .orElseThrow(() -> new ResourceNotFoundException("Notebook not found"));
        if (!notebook.getUserId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to access this notebook");
        }
        return notebook;
    }
}
