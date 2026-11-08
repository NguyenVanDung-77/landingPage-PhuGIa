
package com.phugia.backend.service;

import com.phugia.backend.entity.Consultation;
import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.port:0}")
    private int smtpPort;

    public ConsultationEmailService(
            JavaMailSender mailSender,
            UserRepository userRepository
    ) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
    }

    public void notifyAllAdmins(
            Consultation consultation
    ) {

        Long consultationId = consultation.getId();

        log.info(
                "[MAIL] Bắt đầu gửi thông báo tư vấn #{}",
                consultationId
        );

        log.info(
                "[MAIL] SMTP host={}, port={}",
                smtpHost,
                smtpPort
        );

        if (senderEmail == null
                || senderEmail.isBlank()) {

            log.error(
                    "[MAIL] Chưa cấu hình spring.mail.username"
            );
            return;
        }

        List<User> admins;

        try {
            admins =
                    userRepository.findByRoleAndEnabledTrue(
                            "ADMIN"
                    );
        } catch (Exception exception) {

            log.error(
                    "[MAIL] Không thể lấy danh sách ADMIN " +
                    "cho tư vấn #{}",
                    consultationId,
                    exception
            );
            return;
        }

        log.info(
                "[MAIL] Tìm thấy {} ADMIN đang hoạt động",
                admins.size()
        );

        if (admins.isEmpty()) {
            log.warn(
                    "[MAIL] Không có ADMIN để nhận email"
            );
            return;
        }

        Set<String> sentEmails = new HashSet<>();

        int successCount = 0;
        int failureCount = 0;
        int skippedCount = 0;

        for (User admin : admins) {

            String adminEmail = admin.getEmail();

            if (adminEmail == null
                    || adminEmail.isBlank()) {

                skippedCount++;

                log.warn(
                        "[MAIL] Bỏ qua ADMIN ID {} " +
                        "vì chưa có email",
                        admin.getId()
                );
                continue;
            }

            adminEmail = adminEmail.trim();

            String normalizedEmail =
                    adminEmail.toLowerCase(Locale.ROOT);

            if (!sentEmails.add(normalizedEmail)) {
                skippedCount++;
                continue;
            }

            long startTime = System.currentTimeMillis();

            try {

                log.info(
                        "[MAIL] Đang gửi tư vấn #{} " +
                        "đến ADMIN ID {}",
                        consultationId,
                        admin.getId()
                );

                SimpleMailMessage mail =
                        new SimpleMailMessage();

                mail.setFrom(senderEmail.trim());
                mail.setTo(adminEmail);

                mail.setSubject(
                        "[PHU GIA ROYAL PARK] " +
                        "Yeu cau tu van moi #" +
                        consultationId
                );

                String content =
                        "PHU GIA ROYAL PARK\n\n" +
                        "Co khach hang vua dang ky tu van.\n\n" +
                        "Ma yeu cau: " +
                        consultationId +
                        "\nHo ten: " +
                        safe(consultation.getFullName()) +
                        "\nSo dien thoai: " +
                        safe(consultation.getPhone()) +
                        "\nEmail: " +
                        safe(consultation.getEmail()) +
                        "\nNoi dung: " +
                        safe(consultation.getMessage()) +
                        "\nTrang thai: " +
                        safe(consultation.getStatus()) +
                        "\n\n" +
                        "Vui long dang nhap trang quan tri " +
                        "de xu ly yeu cau.\n";

                mail.setText(content);

                mailSender.send(mail);

                successCount++;

                long duration =
                        System.currentTimeMillis() - startTime;

                log.info(
                        "[MAIL] SUCCESS - Tu van #{} " +
                        "ADMIN ID {} - {} ms",
                        consultationId,
                        admin.getId(),
                        duration
                );

            } catch (Exception exception) {

                failureCount++;

                long duration =
                        System.currentTimeMillis() - startTime;

                log.error(
                        "[MAIL] FAILED - Tu van #{} " +
                        "ADMIN ID {} - {} ms",
                        consultationId,
                        admin.getId(),
                        duration
                );

                log.error(
                        "[MAIL] Loai loi: {}",
                        exception.getClass().getName()
                );

                log.error(
                        "[MAIL] Chi tiet loi gui Gmail " +
                        "cho tu van #{}",
                        consultationId,
                        exception
                );
            }
        }

        log.info(
                "[MAIL] KET QUA - Tu van #{}: " +
                "Thanh cong={}, That bai={}, Bo qua={}",
                consultationId,
                successCount,
                failureCount,
                skippedCount
        );
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "(Không có)"
                : value.trim();
    }
}
