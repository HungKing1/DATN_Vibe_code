package com.example.backend.service;



import com.example.backend.dto.response.legal.LegalDocumentSummaryResponse;
import com.example.backend.dto.response.legal.LegalDocumentDetailResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface LegalDataService {


    Page<LegalDocumentSummaryResponse> getDocumentList(int page, int size);
    Page<LegalDocumentSummaryResponse> searchDocuments(String keyword, int page, int size);
    LegalDocumentDetailResponse getDocumentDetail(String soKyHieu);
}
