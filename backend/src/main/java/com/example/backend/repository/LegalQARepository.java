package com.example.backend.repository;

import com.example.backend.entity.LegalQA;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LegalQARepository extends MongoRepository<LegalQA, String> {
    List<LegalQA> findBySoKyHieuOrderByDieuAsc(String soKyHieu);
}
