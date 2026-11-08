
package com.phugia.backend.controller;

import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUsersController {

    private final UserRepository userRepository;

    public AdminUsersController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record UserResponse(
            Long id,
            String username,
            String fullName,
            String email,
            String role,
            boolean enabled,
            LocalDateTime createdAt
    ) {}

    public record RoleRequest(String role) {}

    public record StatusRequest(Boolean enabled) {}

    private User requireAdmin(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn chưa đăng nhập"
            );
        }

        User current = userRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Tài khoản không tồn tại"
                ));

        if (!current.isEnabled()
                || !"ADMIN".equals(current.getRole())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ ADMIN được quản lý người dùng"
            );
        }

        return current;
    }

    private User findTarget(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy người dùng"
                ));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }

    @GetMapping
    public List<UserResponse> getUsers(
            Authentication authentication
    ) {
        requireAdmin(authentication);

        return userRepository.findAll()
                .stream()
                .sorted((a, b) ->
                        Long.compare(b.getId(), a.getId()))
                .map(this::toResponse)
                .toList();
    }

    @PatchMapping("/{id}/role")
    public UserResponse updateRole(
            @PathVariable Long id,
            @RequestBody RoleRequest request,
            Authentication authentication
    ) {
        User current = requireAdmin(authentication);
        User target = findTarget(id);

        if (current.getId().equals(target.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể tự thay đổi quyền của mình"
            );
        }

        String role = request.role() == null
                ? ""
                : request.role().trim()
                        .toUpperCase(Locale.ROOT);

        if (!role.equals("USER") && !role.equals("ADMIN")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role chỉ được là USER hoặc ADMIN"
            );
        }

        target.setRole(role);

        return toResponse(userRepository.save(target));
    }

    @PatchMapping("/{id}/status")
    public UserResponse updateStatus(
            @PathVariable Long id,
            @RequestBody StatusRequest request,
            Authentication authentication
    ) {
        User current = requireAdmin(authentication);
        User target = findTarget(id);

        if (current.getId().equals(target.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể tự khóa tài khoản của mình"
            );
        }

        if (request.enabled() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ"
            );
        }

        target.setEnabled(request.enabled());

        return toResponse(userRepository.save(target));
    }
}
