package com.bviit.analytics.auth.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final int MIN_SECRET_LENGTH = 32;

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        String normalizedSecret = secret == null ? "" : secret.trim();
        if (normalizedSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "app.jwt.secret must be configured with at least %d characters.".formatted(MIN_SECRET_LENGTH)
            );
        }
        if (expirationMs <= 0) {
            throw new IllegalStateException("app.jwt.expiration-ms must be greater than zero.");
        }

        this.key = Keys.hmacShaKeyFor(normalizedSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String subject) {
        return Jwts.builder()
                .subject(subject)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String getSubjectFromToken(String token) {
        String subject = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
        if (subject == null || subject.isBlank()) {
            throw new JwtException("JWT subject is missing");
        }
        return subject;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
