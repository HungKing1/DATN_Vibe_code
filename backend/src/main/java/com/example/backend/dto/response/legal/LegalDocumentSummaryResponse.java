package com.example.backend.dto.response.legal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LegalDocumentSummaryResponse {
    private String soKyHieu;
    private String tenDayDu;
    private String loaiVanBan;
    private String coQuanBanHanh;
    private String ngayThongQua;
    private String ngayHieuLuc;
    private String trangThai;
    private Integer tongSoDieu;
}
