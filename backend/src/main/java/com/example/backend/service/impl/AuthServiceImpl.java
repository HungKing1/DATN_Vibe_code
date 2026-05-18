package com.example.backend.service.impl;

import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.entity.User;
import com.example.backend.entity.UserAuthSession;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.repository.UserAuthSessionRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.AuthService;
import com.example.backend.util.CookieUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserAuthSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final CookieUtils cookieUtils;

    @Override
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("ROLE_USER")
                .progress(new User.Progress())
                .settings(new User.Settings())
                .build();
        userRepository.save(user);
    }

    @Override
    public User login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        String sessionId = UUID.randomUUID().toString();
        int maxAge = 7 * 24 * 60 * 60; // 7 days

        UserAuthSession session = UserAuthSession.builder()
                .userId(user.getId())
                .sessionId(sessionId)
                .userAgent(httpRequest.getHeader("User-Agent"))
                .ip(httpRequest.getRemoteAddr())
                .expiresAt(LocalDateTime.now().plusSeconds(maxAge))
                .build();
        sessionRepository.save(session);

        cookieUtils.addSessionCookie(httpResponse, sessionId, maxAge);

        return user;
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String sessionId = cookieUtils.extractSessionId(request);
        if (sessionId != null) {
            sessionRepository.deleteBySessionId(sessionId);
        }
        cookieUtils.clearSessionCookie(response);
    }
}
