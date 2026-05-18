package com.example.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_auth_sessions")
public class UserAuthSession {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed(unique = true)
    private String sessionId;

    private String userAgent;

    private String ip;

    @CreatedDate
    private LocalDateTime createdAt;

    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiresAt;
}
