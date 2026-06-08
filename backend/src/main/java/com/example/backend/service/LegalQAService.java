package com.example.backend.service;

import com.example.backend.entity.LegalQA;
import java.util.List;

public interface LegalQAService {
    List<LegalQA> getLegalQABySoKyHieu(String soKyHieu);
}
