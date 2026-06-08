package com.example.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "legal_qa")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalQA {
    @Id
    private String id;

    @Field("soKyHieu")
    private String soKyHieu;

    private Integer dieu;

    private String question;

    private String answer;

    @Field("createdAt")
    private LocalDateTime createdAt;
}
