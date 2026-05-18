package com.example.backend.service;

import com.example.backend.dto.request.NotebookRequest;
import com.example.backend.entity.Message;
import com.example.backend.entity.Notebook;

import java.util.List;

public interface NotebookService {
    List<Notebook> getUserNotebooks(String userId);
    Notebook createNotebook(String userId, NotebookRequest request);
    Notebook updateNotebook(String notebookId, String userId, NotebookRequest request);
    void deleteNotebook(String notebookId, String userId);
    
    List<Message> getNotebookMessages(String notebookId, String userId);
    void deleteNotebookMessages(String notebookId, String userId);
    List<String> getSuggestions(String notebookId, String userId);
}
