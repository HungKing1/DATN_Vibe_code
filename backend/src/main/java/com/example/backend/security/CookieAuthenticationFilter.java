package com.example.backend.security;

import com.example.backend.entity.UserAuthSession;
import com.example.backend.repository.UserAuthSessionRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.util.CookieUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CookieAuthenticationFilter extends OncePerRequestFilter {

    private final CookieUtils cookieUtils;
    private final UserAuthSessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String sessionId = cookieUtils.extractSessionId(request);

        if (sessionId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Optional<UserAuthSession> sessionOpt = sessionRepository.findBySessionId(sessionId);

            if (sessionOpt.isPresent()) {
                UserAuthSession session = sessionOpt.get();
                if (session.getExpiresAt().isAfter(LocalDateTime.now())) {
                    userRepository.findById(session.getUserId()).ifPresent(user -> {
                        UserDetails userDetails = new CustomUserDetails(user);
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    });
                } else {
                    sessionRepository.deleteBySessionId(sessionId);
                    cookieUtils.clearSessionCookie(response);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
