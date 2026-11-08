
package com.phugia.backend.service;

import com.phugia.backend.entity.Consultation;
import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ConsultationEmailService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ConsultationEmailService.class
            );

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    public ConsultationEmailService(
            JavaMailSender mailSender,
            UserRepository userRepository
    ) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
    }

    // =========================================
    // GỬI THÔNG BÁO ĐẾN TẤT CẢ ADMIN
    // =========================================

    public void notifyAllAdmins(
            Consultation consultation
    ) {

        List<User> admins =
                userRepository.findByRoleAndEnabledTrue(
                        "ADMIN"
                );

        if (admins.isEmpty()) {
            log.warn(
                    "Không tìm thấy tài khoản ADMIN đang hoạt động."
            );
            return;
        }

        if (senderEmail == null
                || senderEmail.isBlank()) {
            log.error(
                    "Chưa cấu hình GMAIL_USERNAME. "
                    + "Không thể gửi email tư vấn."
            );
            return;
        }

        Set<String> sentEmails = new HashSet<>();

        int successCount = 0;
        int failureCount = 0;

        for (User admin : admins) {

            String adminEmail = admin.getEmail();

            if (adminEmail == null
                    || adminEmail.isBlank()) {
                log.warn(
                        "ADMIN ID {} chưa có email.",
                        admin.getId()
                );
                continue;
            }

            adminEmail = adminEmail.trim();

            // Không gửi trùng một địa chỉ email
            if (!sentEmails.add(
                    adminEmail.toLowerCase(
                            java.util.Locale.ROOT
                    )
            )) {
                continue;
            }

            try {

                SimpleMailMessage mail =
                        new SimpleMailMessage();

                mail.setFrom(senderEmail.trim());
                mail.setTo(adminEmail);

                mail.setSubject(
                        "[PHU GIA ROYAL PARK] "
                        + "Yeu cau tu van moi #"
                        + consultation.getId()
                );

                String content =
                        "PHU GIA ROYAL PARK\n\n"
                        + "Co khach hang vua dang ky tu van.\n\n"
                        + "Ma yeu cau: "
                        + consultation.getId()
                        + "\n"
                        + "Ho ten: "
                        + safe(consultation.getFullName())
                        + "\n"
                        + "So dien thoai: "
                        + safe(consultation.getPhone())
                        + "\n"
                        + "Email: "
                        + safe(consultation.getEmail())
                        + "\n"
                        + "Noi dung: "
                        + safe(consultation.getMessage())
                        + "\n"
                        + "Trang thai: "
                        + safe(consultation.getStatus())
                        + "\n\n"
                        + "Vui long dang nhap trang quan tri "
                        + "de xu ly yeu cau.\n";

                mail.setText(content);

                mailSender.send(mail);

                successCount++;

                log.info(
                        "Đã gửi thông báo tư vấn #{} đến {}",
                        consultation.getId(),
                        adminEmail
                );

            } catch (MailException exception) {

                failureCount++;

                log.error(
                        "Không thể gửi thông báo tư vấn #{} "
                        + "đến {}: {}",
                        consultation.getId(),
                        adminEmail,
                        exception.getMessage()
                );
            }
        }

        log.info(
                "Kết quả gửi tư vấn #{}: "
                + "thành công {}, thất bại {}",
                consultation.getId(),
                successCount,
                failureCount
        );
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "(Không có)"
                : value.trim();
    }
}
