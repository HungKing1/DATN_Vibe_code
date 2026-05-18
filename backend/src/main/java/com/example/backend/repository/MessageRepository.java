package com.example.backend.repository;

import com.example.backend.entity.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByNotebookIdOrderByCreatedAtAsc(String notebookId);
    void deleteByNotebookId(String notebookId);
    Optional<Message> findFirstByNotebookIdAndRoleOrderByCreatedAtDesc(String notebookId, String role);
}
