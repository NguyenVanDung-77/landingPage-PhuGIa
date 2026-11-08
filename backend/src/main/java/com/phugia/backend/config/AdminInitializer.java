
package com.phugia.backend.config;

import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminInitializer {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CommandLineRunner createAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {

            String username = System.getenv("PHUGIA_ADMIN_USERNAME");
            String password = System.getenv("PHUGIA_ADMIN_PASSWORD");

            if (username == null || username.isBlank()
                    || password == null || password.isBlank()) {
                System.out.println(
                    "Chua cau hinh tai khoan Admin. " +
                    "Can PHUGIA_ADMIN_USERNAME va PHUGIA_ADMIN_PASSWORD."
                );
                return;
            }

            if (userRepository.existsByUsername(username)) {
                System.out.println(
                    "Tai khoan Admin da ton tai: " + username
                );
                return;
            }

            User admin = new User();

            admin.setUsername(username);
            admin.setPassword(passwordEncoder.encode(password));
            admin.setFullName("Quản trị Phú Gia Royal Park");
            admin.setRole("ADMIN");
            admin.setEnabled(true);

            userRepository.save(admin);

            System.out.println(
                "Da tao tai khoan Admin thanh cong: " + username
            );
        };
    }
}
