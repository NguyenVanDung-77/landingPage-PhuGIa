
package com.phugia.backend.service;

import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class GoogleAccountService {

    private final UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public GoogleAccountService(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User findOrCreateGoogleUser(OidcUser googleUser) {

        String googleSubject = googleUser.getSubject();
        String email = googleUser.getEmail();

        if (googleSubject == null || googleSubject.isBlank()) {
            throw new BadCredentialsException(
                    "Google không cung cấp mã định danh tài khoản"
            );
        }

        if (email == null || email.isBlank()
                || !Boolean.TRUE.equals(
                        googleUser.getEmailVerified()
                )) {
            throw new BadCredentialsException(
                    "Email Google chưa được xác minh"
            );
        }

        String normalizedEmail =
                email.trim().toLowerCase(Locale.ROOT);

        // Tài khoản Google đã được liên kết từ trước
        User existingGoogleUser = userRepository
                .findByGoogleSubject(googleSubject)
                .orElse(null);

        if (existingGoogleUser != null) {

            if (!existingGoogleUser.isEnabled()) {
                throw new DisabledException(
                        "Tài khoản đã bị khóa"
                );
            }

            // Không cho phép một tài khoản Google
            // sử dụng email đang thuộc tài khoản khác
            User emailOwner = userRepository
                    .findByEmailIgnoreCase(normalizedEmail)
                    .orElse(null);

            if (emailOwner != null
                    && !emailOwner.getId().equals(
                            existingGoogleUser.getId()
                    )) {
                throw new BadCredentialsException(
                        "Email đã thuộc tài khoản khác"
                );
            }

            return existingGoogleUser;
        }

        // Không tự động liên kết tài khoản bằng email.
        // Điều này bảo vệ tài khoản ADMIN có sẵn.
        if (userRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .isPresent()) {
            throw new BadCredentialsException(
                    "Email này đã được sử dụng. " +
                    "Vui lòng đăng nhập bằng tài khoản hiện tại."
            );
        }

        User newUser = new User();

        // Google subject là định danh ổn định
        // của tài khoản trong Google OAuth.
        String username = "google_" + googleSubject;

        if (username.length() > 100) {
            throw new BadCredentialsException(
                    "Mã định danh Google không hợp lệ"
            );
        }

        if (userRepository.existsByUsername(username)) {
            throw new BadCredentialsException(
                    "Tên tài khoản đã tồn tại"
            );
        }

        newUser.setUsername(username);

        // Google Login không dùng mật khẩu nội bộ.
        // Vẫn lưu một mật khẩu ngẫu nhiên để đáp ứng
        // ràng buộc NOT NULL của bảng users.
        String randomPassword =
                UUID.randomUUID().toString()
                + UUID.randomUUID();

        newUser.setPassword(
                passwordEncoder.encode(randomPassword)
        );

        String fullName = googleUser.getFullName();

        if (fullName == null || fullName.isBlank()) {
            fullName = normalizedEmail;
        }

        if (fullName.length() > 150) {
            fullName = fullName.substring(0, 150);
        }

        newUser.setFullName(fullName);
        newUser.setEmail(normalizedEmail);
        newUser.setGoogleSubject(googleSubject);

        // Google mới luôn có quyền USER.
        newUser.setRole("USER");
        newUser.setEnabled(true);

        try {
            return userRepository.saveAndFlush(newUser);
        } catch (DataIntegrityViolationException ex) {
            throw new BadCredentialsException(
                    "Không thể tạo tài khoản Google. " +
                    "Vui lòng thử lại.",
                    ex
            );
        }
    }
}
