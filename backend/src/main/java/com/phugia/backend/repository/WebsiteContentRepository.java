
package com.phugia.backend.repository;

import com.phugia.backend.entity.WebsiteContent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WebsiteContentRepository
        extends JpaRepository<WebsiteContent, Long> {

    Optional<WebsiteContent> findByContentKey(String contentKey);
}
