package com.example.backend.service.impl;

import com.example.backend.entity.Clause;
import com.example.backend.entity.Law;
import com.example.backend.entity.LegalTopic;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ClauseRepository;
import com.example.backend.repository.LawRepository;
import com.example.backend.repository.LegalTopicRepository;
import com.example.backend.service.LegalDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LegalDataServiceImpl implements LegalDataService {

    private final LawRepository lawRepository;
    private final LegalTopicRepository topicRepository;
    private final ClauseRepository clauseRepository;

    @Override
    public List<Law> getLaws() {
        return lawRepository.findAll();
    }

    @Override
    public List<LegalTopic> getTopics() {
        return topicRepository.findAll();
    }

    @Override
    public List<Clause> getClausesByLaw(String lawId) {
        return clauseRepository.findByLawId(lawId);
    }

    @Override
    public Clause getClause(String id) {
        return clauseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Clause not found"));
    }
}
