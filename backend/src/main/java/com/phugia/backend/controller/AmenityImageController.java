
package com.phugia.backend.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads/amenities")
public class AmenityImageController {

    // ==========================================
    // THƯ MỤC LƯU ẢNH TIỆN ÍCH
    //
    // Khi chạy Maven trong thư mục backend:
    // backend/uploads/amenities/
    //
    // KHÔNG ĐỤNG VÀO 3 ẢNH NỀN FRONTEND.
    // ==========================================

    private final Path uploadDirectory =
            Paths.get("uploads", "amenities")
                    .toAbsolutePath()
                    .normalize();

    private static final long MAX_FILE_SIZE =
            10L * 1024 * 1024;

    // ==========================================
    // 1. ADMIN TẢI ẢNH LÊN
    //
    // POST /api/uploads/amenities
    // FormData: file
    // ==========================================

    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn ảnh."
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Ảnh không được lớn hơn 10 MB."
            );
        }

        // Kiểm tra chữ ký file thay vì chỉ
        // dựa vào tên file do người dùng gửi.

        byte[] header;

        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(12);
        }

        String extension = detectImageExtension(header);

        if (extension == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
            );
        }

        // Tạo tên UUID để ảnh mới không ghi đè
        // ảnh cũ hoặc 3 ảnh nền cố định.

        String filename =
                UUID.randomUUID() + "." + extension;

        Files.createDirectories(uploadDirectory);

        Path target = uploadDirectory
                .resolve(filename)
                .normalize();

        // Chặn đường dẫn ra ngoài thư mục upload.

        if (!target.getParent().equals(uploadDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đường dẫn ảnh không hợp lệ."
            );
        }

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target);
        }

        // Đường dẫn USER sử dụng để xem ảnh.

        String imageUrl =
                "/api/uploads/amenities/" + filename;

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "success", "true",
                        "filename", filename,
                        "url", imageUrl,
                        "message", "Tải ảnh thành công"
                ));
    }

    // ==========================================
    // 2. USER VÀ ADMIN XEM ẢNH
    //
    // GET /api/uploads/amenities/{filename}
    // ==========================================

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getImage(
            @PathVariable String filename
    ) throws IOException {

        Path file = resolveSafeFile(filename);

        if (!Files.isRegularFile(file)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy ảnh."
            );
        }

        Resource resource =
                new UrlResource(file.toUri());

        if (!resource.isReadable()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không thể đọc ảnh."
            );
        }

        MediaType contentType =
                getContentType(filename);

        return ResponseEntity.ok()
                .contentType(contentType)
                .contentLength(Files.size(file))
                .cacheControl(
                        CacheControl
                                .maxAge(Duration.ofDays(7))
                                .cachePublic()
                )
                .header(
                        "X-Content-Type-Options",
                        "nosniff"
                )
                .body(resource);
    }

    // ==========================================
    // 3. ADMIN XÓA ẢNH ĐÃ TẢI LÊN
    //
    // DELETE /api/uploads/amenities/{filename}
    // ==========================================

    @DeleteMapping("/{filename:.+}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable String filename
    ) throws IOException {

        Path file = resolveSafeFile(filename);

        if (!Files.deleteIfExists(file)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy ảnh để xóa."
            );
        }

        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 4. KIỂM TRA TÊN FILE AN TOÀN
    //
    // Chỉ cho phép tên UUID do Backend tạo.
    // ==========================================

    private Path resolveSafeFile(String filename) {

        if (filename == null ||
                !filename.matches(
                        "(?i)[0-9a-f]{8}-" +
                        "[0-9a-f]{4}-" +
                        "[0-9a-f]{4}-" +
                        "[0-9a-f]{4}-" +
                        "[0-9a-f]{12}\\.(jpg|png|webp)"
                )) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tên file không hợp lệ."
            );
        }

        Path file = uploadDirectory
                .resolve(filename)
                .normalize();

        if (!file.getParent().equals(uploadDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đường dẫn không hợp lệ."
            );
        }

        return file;
    }

    // ==========================================
    // 5. KIỂM TRA ĐỊNH DẠNG ẢNH
    // ==========================================

    private String detectImageExtension(byte[] data) {

        if (data.length >= 3 &&
                (data[0] & 0xFF) == 0xFF &&
                (data[1] & 0xFF) == 0xD8 &&
                (data[2] & 0xFF) == 0xFF) {

            return "jpg";
        }

        if (data.length >= 8 &&
                (data[0] & 0xFF) == 0x89 &&
                data[1] == 0x50 &&
                data[2] == 0x4E &&
                data[3] == 0x47 &&
                data[4] == 0x0D &&
                data[5] == 0x0A &&
                data[6] == 0x1A &&
                data[7] == 0x0A) {

            return "png";
        }

        if (data.length >= 12 &&
                data[0] == 'R' &&
                data[1] == 'I' &&
                data[2] == 'F' &&
                data[3] == 'F' &&
                data[8] == 'W' &&
                data[9] == 'E' &&
                data[10] == 'B' &&
                data[11] == 'P') {

            return "webp";
        }

        return null;
    }

    // ==========================================
    // 6. CONTENT-TYPE KHI HIỂN THỊ
    // ==========================================

    private MediaType getContentType(String filename) {

        String lower = filename.toLowerCase();

        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }

        return MediaType.IMAGE_JPEG;
    }
}
