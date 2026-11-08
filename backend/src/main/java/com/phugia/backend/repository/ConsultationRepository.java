
package com.phugia.backend.repository;

import com.phugia.backend.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationRepository
        extends JpaRepository<Consultation, Long> {

    List<Consultation> findAllByOrderByCreatedAtDesc();

    List<Consultation> findByStatusOrderByCreatedAtDesc(String status);
}
