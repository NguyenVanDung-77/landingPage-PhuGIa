
package com.phugia.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "website_contents")
public class WebsiteContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_key", nullable = false,
            unique = true, length = 150)
    private String contentKey;

    @Lob
    @Column(name = "content_value", columnDefinition = "LONGTEXT")
    private String contentValue;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public WebsiteContent() {
    }

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getContentKey() {
        return contentKey;
    }

    public void setContentKey(String contentKey) {
        this.contentKey = contentKey;
    }

    public String getContentValue() {
        return contentValue;
    }

    public void setContentValue(String contentValue) {
        this.contentValue = contentValue;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
