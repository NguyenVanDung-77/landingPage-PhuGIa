
package com.phugia.backend.controller;

import com.phugia.backend.entity.WebsiteContent;
import com.phugia.backend.repository.WebsiteContentRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contents")
@CrossOrigin(origins = "http://localhost:5173")
public class WebsiteContentController {

    private final WebsiteContentRepository repository;

    public WebsiteContentController(
            WebsiteContentRepository repository) {
        this.repository = repository;
    }

    // Lấy toàn bộ nội dung
    @GetMapping
    public List<WebsiteContent> getAllContents() {
        return repository.findAll();
    }

    // Lấy nội dung theo key
    @GetMapping("/{key}")
    public ResponseEntity<WebsiteContent> getContent(
            @PathVariable String key) {

        return repository.findByContentKey(key)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Tạo hoặc cập nhật nội dung
    @PutMapping("/{key}")
    public WebsiteContent updateContent(
            @PathVariable String key,
            @RequestBody Map<String, String> body) {

        WebsiteContent content = repository
                .findByContentKey(key)
                .orElseGet(WebsiteContent::new);

        content.setContentKey(key);
        content.setContentValue(
                body.getOrDefault("value", "")
        );

        return repository.save(content);
    }
}
