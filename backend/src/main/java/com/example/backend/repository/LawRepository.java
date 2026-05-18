package com.example.backend.repository;

import com.example.backend.entity.Law;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LawRepository extends MongoRepository<Law, String> {
}
