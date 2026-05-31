package com.example.backend.repository;

import com.example.backend.entity.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    void deleteByConversationId(String conversationId);
    Optional<Message> findFirstByConversationIdAndRoleOrderByCreatedAtDesc(String conversationId, String role);
}
