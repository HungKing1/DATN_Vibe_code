package com.example.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    @Builder.Default
    private String role = "ROLE_USER";


    private Settings settings;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Settings {
        @Builder.Default
        private String aiModel = "gpt-4o";
        @Builder.Default
        private boolean compactMode = false;
    }
}
