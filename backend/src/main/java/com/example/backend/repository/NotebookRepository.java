package com.example.backend.repository;

import com.example.backend.entity.Notebook;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotebookRepository extends MongoRepository<Notebook, String> {
    List<Notebook> findByUserIdOrderByUpdatedAtDesc(String userId);
}
