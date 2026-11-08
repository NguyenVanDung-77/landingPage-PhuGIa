
package com.phugia.backend.service;

import tools.jackson.databind.ObjectMapper;
import com.phugia.backend.entity.Consultation;
import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ConsultationEmailService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ConsultationEmailService.class
            );

    private static final String BREVO_API_URL =
            "https://api.brevo.com/v3/smtp/email";

    private final UserRepository userRepository;

    private final ObjectMapper objectMapper =
            new ObjectMapper();

    private final HttpClient httpClient =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

    @Value("${BREVO_API_KEY:}")
    private String brevoApiKey;

    @Value("${BREVO_SENDER_EMAIL:}")
    private String senderEmail;

    public ConsultationEmailService(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    public void notifyAllAdmins(
            Consultation consultation
    ) {

        Long consultationId = consultation.getId();

        log.info(
                "[BREVO] Bat dau gui thong bao tu van #{}",
                consultationId
        );

        if (brevoApiKey == null
                || brevoApiKey.isBlank()) {

            log.error(
                    "[BREVO] Chua cau hinh BREVO_API_KEY"
            );
            return;
        }

        if (senderEmail == null
                || senderEmail.isBlank()) {

            log.error(
                    "[BREVO] Chua cau hinh BREVO_SENDER_EMAIL"
            );
            return;
        }

        try {

            List<User> admins =
                    userRepository.findByRoleAndEnabledTrue(
                            "ADMIN"
                    );

            if (admins.isEmpty()) {

                log.warn(
                        "[BREVO] Khong co ADMIN dang hoat dong"
                );
                return;
            }

            Set<String> uniqueEmails = new HashSet<>();

            List<Map<String, String>> recipients =
                    new ArrayList<>();

            for (User admin : admins) {

                String email = admin.getEmail();

                if (email == null || email.isBlank()) {

                    log.warn(
                            "[BREVO] Bo qua ADMIN ID {} " +
                            "vi chua co email",
                            admin.getId()
                    );
                    continue;
                }

                email = email.trim();

                if (!uniqueEmails.add(
                        email.toLowerCase(Locale.ROOT)
                )) {
                    continue;
                }

                Map<String, String> recipient =
                        new LinkedHashMap<>();

                recipient.put("email", email);

                recipients.add(recipient);
            }

            if (recipients.isEmpty()) {

                log.warn(
                        "[BREVO] Khong co email ADMIN hop le"
                );
                return;
            }

            log.info(
                    "[BREVO] So ADMIN nhan email: {}",
                    recipients.size()
            );

            Map<String, Object> sender =
                    new LinkedHashMap<>();

            sender.put("name", "Phu Gia Royal Park");
            sender.put("email", senderEmail.trim());

            Map<String, Object> payload =
                    new LinkedHashMap<>();

            payload.put("sender", sender);
            payload.put("to", recipients);

            payload.put(
                    "subject",
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

            payload.put("textContent", content);

            String requestBody =
                    objectMapper.writeValueAsString(payload);

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(BREVO_API_URL))
                            .timeout(Duration.ofSeconds(20))
                            .header(
                                    "accept",
                                    "application/json"
                            )
                            .header(
                                    "api-key",
                                    brevoApiKey.trim()
                            )
                            .header(
                                    "content-type",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers
                                            .ofString(requestBody)
                            )
                            .build();

            log.info(
                    "[BREVO] Dang gui HTTPS API cho tu van #{}",
                    consultationId
            );

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            int statusCode = response.statusCode();

            if (statusCode >= 200 && statusCode < 300) {

                log.info(
                        "[BREVO] SUCCESS - Tu van #{} " +
                        "- HTTP {} - {} nguoi nhan " +
                        "- Brevo da tiep nhan yeu cau",
                        consultationId,
                        statusCode,
                        recipients.size()
                );

            } else {

                log.error(
                        "[BREVO] FAILED - Tu van #{} " +
                        "- HTTP {} - Phan hoi: {}",
                        consultationId,
                        statusCode,
                        response.body()
                );
            }

        } catch (InterruptedException exception) {

            Thread.currentThread().interrupt();

            log.error(
                    "[BREVO] Yeu cau gui email bi gian doan " +
                    "cho tu van #{}",
                    consultationId,
                    exception
            );

        } catch (Exception exception) {

            log.error(
                    "[BREVO] Loi gui email cho tu van #{}",
                    consultationId,
                    exception
            );
        }
    }

    private String safe(String value) {

        return value == null || value.isBlank()
                ? "(Khong co)"
                : value.trim();
    }
}
