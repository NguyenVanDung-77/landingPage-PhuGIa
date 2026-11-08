
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
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads/product-videos")
public class ProductVideoController {

    private static final long MAX_VIDEO_SIZE =
            200L * 1024 * 1024;

    private final Path uploadDirectory =
            Paths.get("uploads", "product-videos")
                    .toAbsolutePath()
                    .normalize();

    // ADMIN tải video trực tiếp từ máy tính.
    // POST /api/uploads/product-videos

    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Map<String, String>> uploadVideo(
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn video."
            );
        }

        if (file.getSize() > MAX_VIDEO_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Video không được vượt quá 200 MB."
            );
        }

        String extension = detectVideoExtension(file);

        if (extension == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Chỉ hỗ trợ video MP4, MOV hoặc WEBM hợp lệ."
            );
        }

        Files.createDirectories(uploadDirectory);

        String filename =
                UUID.randomUUID() + "." + extension;

        Path target = uploadDirectory
                .resolve(filename)
                .normalize();

        if (!target.getParent().equals(uploadDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đường dẫn video không hợp lệ."
            );
        }

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target);
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "success", "true",
                        "filename", filename,
                        "url",
                        "/api/uploads/product-videos/" + filename,
                        "message", "Tải video thành công"
                ));
    }

    // USER và ADMIN xem video.
    // Hỗ trợ HTTP Range để tua video.

    @GetMapping("/{filename:.+}")
    public ResponseEntity<?> getVideo(
            @PathVariable String filename,
            @RequestHeader(
                    value = HttpHeaders.RANGE,
                    required = false
            ) String rangeHeader
    ) throws IOException {

        Path file = resolveSafeFile(filename);

        if (!Files.isRegularFile(file)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy video."
            );
        }

        long fileSize = Files.size(file);

        if (fileSize == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Video không có dữ liệu."
            );
        }

        MediaType contentType = getVideoContentType(filename);

        if (rangeHeader == null || rangeHeader.isBlank()) {
            Resource resource = new UrlResource(file.toUri());

            return ResponseEntity.ok()
                    .contentType(contentType)
                    .contentLength(fileSize)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header("X-Content-Type-Options", "nosniff")
                    .cacheControl(
                            CacheControl.maxAge(Duration.ofDays(7))
                                    .cachePublic()
                    )
                    .body(resource);
        }

        if (!rangeHeader.startsWith("bytes=")
                || rangeHeader.contains(",")) {
            return ResponseEntity.status(
                            HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE
                    )
                    .header(
                            HttpHeaders.CONTENT_RANGE,
                            "bytes */" + fileSize
                    )
                    .build();
        }

        long start;
        long end;

        try {
            String range = rangeHeader.substring(6).trim();
            String[] parts = range.split("-", -1);

            if (parts.length != 2) {
                throw new NumberFormatException();
            }

            if (parts[0].isBlank()) {
                long suffix = Long.parseLong(parts[1]);

                if (suffix <= 0) {
                    throw new NumberFormatException();
                }

                start = Math.max(0, fileSize - suffix);
                end = fileSize - 1;
            } else {
                start = Long.parseLong(parts[0]);

                end = parts[1].isBlank()
                        ? fileSize - 1
                        : Long.parseLong(parts[1]);
            }

            if (start < 0 || start >= fileSize || end < start) {
                throw new NumberFormatException();
            }

            end = Math.min(end, fileSize - 1);

        } catch (NumberFormatException ex) {
            return ResponseEntity.status(
                            HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE
                    )
                    .header(
                            HttpHeaders.CONTENT_RANGE,
                            "bytes */" + fileSize
                    )
                    .build();
        }

        long contentLength = end - start + 1;

        if (contentLength > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Khoảng dữ liệu quá lớn."
            );
        }

        byte[] bytes = new byte[(int) contentLength];

        try (RandomAccessFile raf =
                     new RandomAccessFile(file.toFile(), "r")) {

            raf.seek(start);
            raf.readFully(bytes);
        }

        return ResponseEntity
                .status(HttpStatus.PARTIAL_CONTENT)
                .contentType(contentType)
                .contentLength(contentLength)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(
                        HttpHeaders.CONTENT_RANGE,
                        "bytes " + start + "-" + end + "/" + fileSize
                )
                .header("X-Content-Type-Options", "nosniff")
                .body(bytes);
    }

    // ADMIN xóa video đã tải lên.

    @DeleteMapping("/{filename:.+}")
    public ResponseEntity<Void> deleteVideo(
            @PathVariable String filename
    ) throws IOException {

        Path file = resolveSafeFile(filename);

        if (!Files.deleteIfExists(file)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy video để xóa."
            );
        }

        return ResponseEntity.noContent().build();
    }

    private Path resolveSafeFile(String filename) {

        if (filename == null ||
                !filename.matches(
                        "(?i)[0-9a-f]{8}-" +
                        "[0-9a-f]{4}-" +
                        "[0-9a-f]{4}-" +
                        "[0-9a-f]{4}-" +
                        "[0-9a-f]{12}\\.(mp4|mov|webm)"
                )) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tên video không hợp lệ."
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

    private String detectVideoExtension(
            MultipartFile file
    ) throws IOException {

        byte[] header;

        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(32);
        }

        // MP4 / MOV sử dụng ISO Base Media File Format.
        if (header.length >= 12 &&
                header[4] == 'f' &&
                header[5] == 't' &&
                header[6] == 'y' &&
                header[7] == 'p') {

            String brand = new String(
                    header,
                    8,
                    4,
                    java.nio.charset.StandardCharsets.US_ASCII
            ).toLowerCase(Locale.ROOT);

            if (brand.equals("qt  ")) {
                return "mov";
            }

            return "mp4";
        }

        // WEBM có chữ ký EBML và DocType webm.
        if (header.length >= 4 &&
                (header[0] & 0xFF) == 0x1A &&
                (header[1] & 0xFF) == 0x45 &&
                (header[2] & 0xFF) == 0xDF &&
                (header[3] & 0xFF) == 0xA3) {

            byte[] probe;

            try (InputStream input = file.getInputStream()) {
                probe = input.readNBytes(4096);
            }

            String probeText = new String(
                    probe,
                    java.nio.charset.StandardCharsets.ISO_8859_1
            ).toLowerCase(Locale.ROOT);

            if (probeText.contains("webm")) {
                return "webm";
            }
        }

        return null;
    }

    private MediaType getVideoContentType(String filename) {

        String lower = filename.toLowerCase(Locale.ROOT);

        if (lower.endsWith(".webm")) {
            return MediaType.parseMediaType("video/webm");
        }

        if (lower.endsWith(".mov")) {
            return MediaType.parseMediaType("video/quicktime");
        }

        return MediaType.parseMediaType("video/mp4");
    }
}
