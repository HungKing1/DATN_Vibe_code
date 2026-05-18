package com.example.backend.repository;

import com.example.backend.entity.LegalTopic;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LegalTopicRepository extends MongoRepository<LegalTopic, String> {
}
