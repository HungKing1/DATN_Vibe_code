package com.example.backend.service.impl;

import com.example.backend.entity.LegalQA;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.LegalQARepository;
import com.example.backend.service.LegalQAService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LegalQAServiceImpl implements LegalQAService {
    private final LegalQARepository legalQARepository;

    @Override
    public List<LegalQA> getLegalQABySoKyHieu(String soKyHieu) {
        if (soKyHieu == null || soKyHieu.trim().isEmpty()) {
            throw new IllegalArgumentException("Tham số 'soKyHieu' không được để trống.");
        }

        List<LegalQA> legalQAs = legalQARepository.findBySoKyHieuOrderByDieuAsc(soKyHieu);

        if (legalQAs == null || legalQAs.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy bộ câu hỏi nào cho văn bản pháp luật: " + soKyHieu + ".");
        }

        return legalQAs;
    }
}
