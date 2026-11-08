
package com.phugia.backend.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

import org.springframework.http.CacheControl;
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

    private final Cloudinary cloudinary;

    // Giữ thư mục cũ để phục vụ ảnh đã upload trước đây.
    private final Path legacyUploadDirectory =
            Paths.get("uploads", "amenities")
                    .toAbsolutePath()
                    .normalize();

    private static final long MAX_FILE_SIZE =
            10L * 1024 * 1024;

    private static final String UUID_PATTERN =
            "(?i)[0-9a-f]{8}-[0-9a-f]{4}-" +
            "[0-9a-f]{4}-[0-9a-f]{4}-" +
            "[0-9a-f]{12}";

    private static final String LEGACY_FILENAME_PATTERN =
            UUID_PATTERN + "\\.(jpg|png|webp)";

    public AmenityImageController(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    // ==========================================
    // 1. UPLOAD ẢNH MỚI LÊN CLOUDINARY
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

        byte[] header;

        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(12);
        }

        if (detectImageExtension(header) == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
            );
        }

        String publicId = UUID.randomUUID().toString();

        Map<?, ?> uploadResult;

        try {
            uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "phugia/amenities",
                            "public_id", publicId,
                            "resource_type", "image",
                            "overwrite", false
                    )
            );
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Không thể tải ảnh lên Cloudinary.",
                    e
            );
        }

        Object secureUrl = uploadResult.get("secure_url");
        Object cloudPublicId = uploadResult.get("public_id");

        if (!(secureUrl instanceof String imageUrl)
                || !imageUrl.startsWith(
                        "https://res.cloudinary.com/")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cloudinary không trả về URL hợp lệ."
            );
        }

        String savedPublicId =
                cloudPublicId instanceof String id
                        ? id
                        : "phugia/amenities/" + publicId;

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "success", "true",
                        "filename", savedPublicId,
                        "url", imageUrl,
                        "message", "Tải ảnh thành công"
                ));
    }

    // ==========================================
    // 2. GET ẢNH CŨ TỪ Ổ ĐĨA BACKEND
    // ==========================================

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getLegacyImage(
            @PathVariable String filename
    ) throws IOException {

        Path file = resolveLegacyFile(filename);

        if (!Files.isRegularFile(file)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Ảnh cũ không còn trên máy chủ."
            );
        }

        Resource resource = new UrlResource(file.toUri());

        if (!resource.isReadable()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không thể đọc ảnh cũ."
            );
        }

        return ResponseEntity.ok()
                .contentType(getContentType(filename))
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
    // 3. XÓA ẢNH CŨ HOẶC ẢNH CLOUDINARY
    //
    // Chỉ nhận UUID hoặc UUID + đuôi ảnh.
    // ==========================================

    @DeleteMapping("/{filename:.+}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable String filename
    ) throws IOException {

        if (filename == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tên ảnh không hợp lệ."
            );
        }

        // Ảnh cũ lưu tại backend/uploads/amenities.
        if (filename.matches(LEGACY_FILENAME_PATTERN)) {

            Path file = resolveLegacyFile(filename);

            if (!Files.deleteIfExists(file)) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy ảnh cũ."
                );
            }

            return ResponseEntity.noContent().build();
        }

        // Ảnh Cloudinary có public_id dạng UUID.
        if (!filename.matches(UUID_PATTERN)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tên ảnh Cloudinary không hợp lệ."
            );
        }

        String publicId =
                "phugia/amenities/" + filename;

        Map<?, ?> result;

        try {
            result = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", "image",
                            "invalidate", true
                    )
            );
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Không thể xóa ảnh trên Cloudinary.",
                    e
            );
        }

        if (!"ok".equals(
                String.valueOf(result.get("result"))
        )) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy ảnh Cloudinary."
            );
        }

        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 4. KIỂM TRA ĐƯỜNG DẪN ẢNH CŨ
    // ==========================================

    private Path resolveLegacyFile(String filename) {

        if (filename == null ||
                !filename.matches(LEGACY_FILENAME_PATTERN)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tên file ảnh cũ không hợp lệ."
            );
        }

        Path file = legacyUploadDirectory
                .resolve(filename)
                .normalize();

        if (!file.getParent().equals(legacyUploadDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đường dẫn không hợp lệ."
            );
        }

        return file;
    }

    // ==========================================
    // 5. NHẬN DIỆN ĐỊNH DẠNG ẢNH
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
    // 6. CONTENT TYPE CHO ẢNH CŨ
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
