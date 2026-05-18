package com.example.backend.repository;

import com.example.backend.entity.Clause;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClauseRepository extends MongoRepository<Clause, String> {
    List<Clause> findByLawId(String lawId);
}
