package com.example.backend.service;

import com.example.backend.entity.Clause;
import com.example.backend.entity.Law;
import com.example.backend.entity.LegalTopic;

import java.util.List;

public interface LegalDataService {
    List<Law> getLaws();
    List<LegalTopic> getTopics();
    List<Clause> getClausesByLaw(String lawId);
    Clause getClause(String id);
}
