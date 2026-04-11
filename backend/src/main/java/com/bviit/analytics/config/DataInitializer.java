package com.bviit.analytics.config;

import com.bviit.analytics.entity.User;
import com.bviit.analytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;
    @Value("${app.seed.admin-login-id:admin}")
    private String adminLoginId;
    @Value("${app.seed.admin-email:admin@bviit.com}")
    private String adminEmail;
    @Value("${app.seed.admin-password:1234}")
    private String adminPassword;
    @Value("${app.seed.admin-name:관리자}")
    private String adminName;

    @Override
    public void run(String... args) {
        if (seedEnabled && userRepository.count() == 0) {
            userRepository.save(User.builder()
                    .loginId(normalizeLoginId(adminLoginId))
                    .email(normalizeEmail(adminEmail))
                    .password(passwordEncoder.encode(adminPassword))
                    .name(adminName)
                    .build());
        }
    }

    private String normalizeLoginId(String loginId) {
        return loginId == null ? null : loginId.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
