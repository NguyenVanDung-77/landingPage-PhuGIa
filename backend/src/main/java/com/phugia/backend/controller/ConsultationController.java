
package com.phugia.backend.controller;

import com.phugia.backend.entity.Consultation;
import com.phugia.backend.entity.User;
import com.phugia.backend.repository.ConsultationRepository;
import com.phugia.backend.repository.UserRepository;
import com.phugia.backend.service.ConsultationEmailService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/consultations")
public class ConsultationController {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ConsultationController.class
            );

    private final ConsultationRepository repository;
    private final UserRepository userRepository;
    private final ConsultationEmailService consultationEmailService;

    private static final Set<String> VALID_STATUSES =
            Set.of("PENDING", "RECEIVED", "CONSULTED");

    public ConsultationController(
            ConsultationRepository repository,
            UserRepository userRepository,
            ConsultationEmailService consultationEmailService
    ) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.consultationEmailService =
                consultationEmailService;
    }

    public record ConsultationRequest(
            @NotBlank(message = "Vui lòng nhập họ tên")
            @Size(max = 150)
            String fullName,

            @NotBlank(message = "Vui lòng nhập số điện thoại")
            @Size(max = 30)
            String phone,

            // Giữ để tương thích với frontend.
            // Email thực tế lấy từ tài khoản đăng nhập.
            String email,

            String message
    ) {}

    public record StatusRequest(
            @NotBlank String status
    ) {}

    // =========================================
    // USER ĐÃ ĐĂNG NHẬP GỬI TƯ VẤN
    // =========================================

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @Valid @RequestBody ConsultationRequest request,
            Authentication authentication
    ) {

        // 1. Kiểm tra đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                        authentication.getPrincipal()
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập trước khi đăng ký tư vấn"
            );
        }

        // 2. Tìm tài khoản đã xác thực
        User user = userRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Không tìm thấy tài khoản đăng nhập"
                        )
                );

        if (!user.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa"
            );
        }

        // 3. Lấy email từ tài khoản đăng nhập
        String verifiedEmail = user.getEmail();

        if (verifiedEmail == null
                || verifiedEmail.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tài khoản chưa có email. "
                    + "Vui lòng cập nhật email trước khi gửi tư vấn."
            );
        }

        // 4. Tạo yêu cầu tư vấn
        Consultation consultation =
                new Consultation();

        consultation.setFullName(
                request.fullName().trim()
        );

        consultation.setPhone(
                request.phone().trim()
        );

        consultation.setEmail(
                verifiedEmail.trim()
        );

        consultation.setMessage(
                request.message()
        );

        consultation.setStatus("PENDING");

        // 5. Lưu vào MariaDB trước
        Consultation saved =
                repository.save(consultation);

        log.info(
                "Đã lưu đăng ký tư vấn #{} vào database.",
                saved.getId()
        );

        // 6. Gửi thông báo đến tất cả ADMIN
        // Nếu SMTP lỗi, không xóa yêu cầu đã lưu.
        try {

            consultationEmailService.notifyAllAdmins(
                    saved
            );

        } catch (Exception exception) {

            log.error(
                    "Đăng ký tư vấn #{} đã lưu thành công "
                    + "nhưng gửi thông báo Gmail thất bại.",
                    saved.getId(),
                    exception
            );
        }

        // 7. Trả kết quả cho frontend
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "success", true,
                        "message",
                        "Đăng ký tư vấn thành công",
                        "id", saved.getId()
                ));
    }

    // =========================================
    // ADMIN XEM TẤT CẢ YÊU CẦU TƯ VẤN
    // =========================================

    @GetMapping
    public List<Consultation> getAll() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    // =========================================
    // ADMIN LỌC THEO TRẠNG THÁI
    // =========================================

    @GetMapping("/status/{status}")
    public List<Consultation> getByStatus(
            @PathVariable String status
    ) {
        String normalized = normalizeStatus(status);

        return repository.findByStatusOrderByCreatedAtDesc(
                normalized
        );
    }

    // =========================================
    // ADMIN CẬP NHẬT TRẠNG THÁI
    // =========================================

    @PatchMapping("/{id}/status")
    public Consultation updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusRequest request
    ) {
        Consultation consultation = repository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy đăng ký tư vấn"
                        )
                );

        consultation.setStatus(
                normalizeStatus(request.status())
        );

        return repository.save(consultation);
    }

    private String normalizeStatus(String status) {

        if (status == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ"
            );
        }

        String normalized =
                status.trim().toUpperCase(Locale.ROOT);

        if (!VALID_STATUSES.contains(normalized)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trạng thái phải là PENDING, "
                    + "RECEIVED hoặc CONSULTED"
            );
        }

        return normalized;
    }
}
