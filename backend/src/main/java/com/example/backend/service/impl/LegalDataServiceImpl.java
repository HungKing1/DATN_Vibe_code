package com.example.backend.service.impl;



import com.example.backend.exception.ResourceNotFoundException;


import com.example.backend.repository.LegalDocumentRepository;
import com.example.backend.repository.LegalArticleRepository;
import com.example.backend.entity.LegalDocument;
import com.example.backend.entity.LegalArticle;
import com.example.backend.dto.response.legal.LegalDocumentSummaryResponse;
import com.example.backend.dto.response.legal.LegalDocumentDetailResponse;
import com.example.backend.service.LegalDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.bson.types.ObjectId;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LegalDataServiceImpl implements LegalDataService {


    private final LegalDocumentRepository legalDocumentRepository;
    private final LegalArticleRepository legalArticleRepository;


    private LegalDocumentSummaryResponse mapToSummary(LegalDocument doc) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return LegalDocumentSummaryResponse.builder()
                .id(doc.getId())
                .soKyHieu(doc.getSoKyHieu())
                .tenDayDu(doc.getTenDayDu())
                .loaiVanBan(doc.getLoaiVanBan())
                .coQuanBanHanh(doc.getCoQuanBanHanh())
                .ngayThongQua(doc.getNgayThongQua() != null ? doc.getNgayThongQua().format(formatter) : null)
                .ngayHieuLuc(doc.getNgayHieuLuc() != null ? doc.getNgayHieuLuc().format(formatter) : null)
                .trangThai(doc.getTrangThai())
                .tongSoDieu(doc.getTongSoDieu())
                .build();
    }

    @Override
    public Page<LegalDocumentSummaryResponse> getDocumentList(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<LegalDocument> documents = legalDocumentRepository.findByTrangThai("active", pageable);
        return documents.map(this::mapToSummary);
    }

    @Override
    public Page<LegalDocumentSummaryResponse> searchDocuments(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<LegalDocument> documents = legalDocumentRepository
                .findByTenDayDuContainingIgnoreCaseOrSoKyHieuContainingIgnoreCase(keyword, keyword, pageable);
        return documents.map(this::mapToSummary);
    }

    @Override
    public LegalDocumentDetailResponse getDocumentDetail(String soKyHieu) {
        LegalDocument doc = legalDocumentRepository.findBySoKyHieu(soKyHieu)
                .orElseThrow(() -> new ResourceNotFoundException("Legal Document not found with soKyHieu: " + soKyHieu));

        List<LegalArticle> articles = legalArticleRepository.findByDocumentIdOrderByDieuAsc(new ObjectId(doc.getId()));

        // Sort articles by doc body order if necessary, but findByDocumentIdOrderByDieuAsc is probably fine
        // since we want to display it ordered by dieu. If body array is different, we can sort by it.
        // Assuming dieu ascending is the correct order.

        Map<String, LegalDocumentDetailResponse.TocGroup> tocMap = new LinkedHashMap<>();
        List<LegalDocumentDetailResponse.ArticleItem> articleItems = new ArrayList<>();

        for (LegalArticle article : articles) {
            String phan = article.getPath() != null ? article.getPath().getPhan() : null;
            String chuong = article.getPath() != null ? article.getPath().getChuong() : null;
            String muc = article.getPath() != null ? article.getPath().getMuc() : null;

            String key = phan + "|" + chuong + "|" + muc;

            tocMap.computeIfAbsent(key, k -> LegalDocumentDetailResponse.TocGroup.builder()
                    .phan(phan)
                    .chuong(chuong)
                    .muc(muc)
                    .items(new ArrayList<>())
                    .build()
            ).getItems().add(LegalDocumentDetailResponse.TocEntry.builder()
                    .id(article.getId())
                    .dieu(article.getDieu())
                    .tenDieu(article.getTenDieu())
                    .anchor("dieu-" + article.getDieu())
                    .build());

            articleItems.add(LegalDocumentDetailResponse.ArticleItem.builder()
                    .id(article.getId())
                    .dieu(article.getDieu())
                    .tenDieu(article.getTenDieu())
                    .titleGoc(article.getTitleGoc())
                    .phan(phan)
                    .chuong(chuong)
                    .muc(muc)
                    .tieuMuc(article.getPath() != null ? article.getPath().getTieuMuc() : null)
                    .content(article.getContent())
                    .build());
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        return LegalDocumentDetailResponse.builder()
                .id(doc.getId())
                .soKyHieu(doc.getSoKyHieu())
                .tenDayDu(doc.getTenDayDu())
                .loaiVanBan(doc.getLoaiVanBan())
                .coQuanBanHanh(doc.getCoQuanBanHanh())
                .khoaQuocHoi(doc.getKhoaQuocHoi())
                .kyHop(doc.getKyHop())
                .ngayThongQua(doc.getNgayThongQua() != null ? doc.getNgayThongQua().format(formatter) : null)
                .chucDanhNguoiKy(doc.getChucDanhNguoiKy())
                .tenNguoiKy(doc.getTenNguoiKy())
                .quocHieu(doc.getQuocHieu())
                .tieuNgu(doc.getTieuNgu())
                .canCuBanHanh(doc.getCanCuBanHanh())
                .toc(new ArrayList<>(tocMap.values()))
                .articles(articleItems)
                .build();
    }
}
