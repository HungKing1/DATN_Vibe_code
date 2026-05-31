package com.example.backend.repository;

import com.example.backend.entity.LegalDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.Query;

@Repository
public interface LegalDocumentRepository extends MongoRepository<LegalDocument, String> {
    Optional<LegalDocument> findBySoKyHieu(String soKyHieu);

    @Query(fields = "{ 'body': 0, 'canCuBanHanh': 0, 'khoaQuocHoi': 0, 'kyHop': 0, 'chucDanhNguoiKy': 0, 'tenNguoiKy': 0, 'quocHieu': 0, 'tieuNgu': 0 }")
    Page<LegalDocument> findByTrangThai(String trangThai, Pageable pageable);

    @Query(fields = "{ 'body': 0, 'canCuBanHanh': 0, 'khoaQuocHoi': 0, 'kyHop': 0, 'chucDanhNguoiKy': 0, 'tenNguoiKy': 0, 'quocHieu': 0, 'tieuNgu': 0 }")
    Page<LegalDocument> findByTenDayDuContainingIgnoreCaseOrSoKyHieuContainingIgnoreCase(
            String tenDayDu, String soKyHieu, Pageable pageable
    );
}
