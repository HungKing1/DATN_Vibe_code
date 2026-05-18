package com.example.backend.repository;

import com.example.backend.entity.UserAuthSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAuthSessionRepository extends MongoRepository<UserAuthSession, String> {
    Optional<UserAuthSession> findBySessionId(String sessionId);
    void deleteBySessionId(String sessionId);
}
