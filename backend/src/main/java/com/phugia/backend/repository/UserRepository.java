
package com.phugia.backend.repository;

import com.phugia.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Đăng nhập bằng username
    Optional<User> findByUsername(String username);

    // Kiểm tra username đã tồn tại
    boolean existsByUsername(String username);

    // Kiểm tra email đã tồn tại
    boolean existsByEmail(String email);

    // Tìm tài khoản bằng Google Account ID
    Optional<User> findByGoogleSubject(String googleSubject);

    // Tìm tài khoản theo email
    Optional<User> findByEmailIgnoreCase(String email);

    // Lấy danh sách ADMIN đang hoạt động
    // Dùng để gửi email thông báo đăng ký tư vấn
    List<User> findByRoleAndEnabledTrue(String role);
}
