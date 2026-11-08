
package com.phugia.backend.controller;

import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    // =========================================
    // 1. CUNG CẤP CSRF TOKEN CHO REACT
    // =========================================

    @GetMapping("/csrf")
    public Map<String, String> csrf(
            CsrfToken csrfToken
    ) {
        return Map.of(
                "headerName",
                csrfToken.getHeaderName(),
                "token",
                csrfToken.getToken()
        );
    }

    // =========================================
    // 2. THÔNG TIN TÀI KHOẢN ĐANG ĐĂNG NHẬP
    // =========================================

    @GetMapping("/me")
    public Map<String, Object> me(
            Authentication authentication
    ) {

        // Chưa đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal()
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập"
            );
        }

        // Lấy tài khoản từ MariaDB
        User user = userRepository
                .findByUsername(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Tài khoản không tồn tại"
                        )
                );

        // Không cho tài khoản bị khóa sử dụng
        if (!user.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa"
            );
        }

        // Trả về thông tin tài khoản
        return Map.of(
                "id",
                user.getId(),

                "username",
                user.getUsername(),

                "fullName",
                user.getFullName() == null
                        ? ""
                        : user.getFullName(),

                "email",
                user.getEmail() == null
                        ? ""
                        : user.getEmail(),

                "role",
                user.getRole(),

                "enabled",
                user.isEnabled(),

                "loginProvider",
                user.getGoogleSubject() != null
                        && !user.getGoogleSubject().isBlank()
                        ? "GOOGLE"
                        : "LOCAL"
        );
    }
}
