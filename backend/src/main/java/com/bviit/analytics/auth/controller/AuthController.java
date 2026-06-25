package com.bviit.analytics.auth.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.auth.dto.LoginRequest;
import com.bviit.analytics.auth.dto.LoginResponse;
import com.bviit.analytics.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }
}
