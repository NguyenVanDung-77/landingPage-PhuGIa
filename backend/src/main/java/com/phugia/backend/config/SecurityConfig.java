
package com.phugia.backend.config;

import com.phugia.backend.entity.User;
import com.phugia.backend.repository.UserRepository;
import com.phugia.backend.service.GoogleAccountService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private static final String LOCAL_FRONTEND_URL =
            "http://localhost:5173";

    private final String frontendUrl;

    public SecurityConfig(
            @Value("${FRONTEND_URL:http://localhost:5173}")
            String frontendUrl
    ) {
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Bean
    public UserDetailsService userDetailsService(
            UserRepository userRepository
    ) {
        return username -> {
            User user = userRepository
                    .findByUsername(username)
                    .orElseThrow(() ->
                            new UsernameNotFoundException(
                                    "Không tìm thấy tài khoản"
                            )
                    );

            return org.springframework.security
                    .core.userdetails.User
                    .withUsername(user.getUsername())
                    .password(user.getPassword())
                    .roles(user.getRole())
                    .disabled(!user.isEnabled())
                    .build();
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(
                List.of(
                        LOCAL_FRONTEND_URL,
                        frontendUrl
                ).stream().distinct().toList()
        );

        config.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/api/**",
                config
        );

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            GoogleAccountService googleAccountService,
            UserDetailsService userDetailsService
    ) throws Exception {

        HttpSessionSecurityContextRepository contextRepository =
                new HttpSessionSecurityContextRepository();

        HttpSessionCsrfTokenRepository csrfRepository =
                new HttpSessionCsrfTokenRepository();

        csrfRepository.setHeaderName("X-XSRF-TOKEN");

        http
                .cors(Customizer.withDefaults())

                .securityContext(context ->
                        context.securityContextRepository(
                                contextRepository
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                "/api/auth/csrf",
                                "/api/auth/login",
                                "/oauth2/authorization/**",
                                "/login/oauth2/code/**"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/contents",
                                "/api/contents/**"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/consultations"
                        ).authenticated()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/consultations",
                                "/api/consultations/**"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/consultations/*/status"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/contents/**"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/uploads/amenities/**"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/uploads/amenities"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/uploads/amenities/**"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                "/api/admin/users",
                                "/api/admin/users/**"
                        ).hasRole("ADMIN")

                        .anyRequest().authenticated()
                )

                // Lưu CSRF token trong session.
                // Frontend lấy token qua /api/auth/csrf
                // rồi gửi token trong header X-XSRF-TOKEN.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                )

                .httpBasic(httpBasic ->
                        httpBasic.disable()
                )

                .formLogin(form -> form

                        .loginProcessingUrl(
                                "/api/auth/login"
                        )

                        .usernameParameter("username")
                        .passwordParameter("password")

                        .successHandler(
                                (request, response, authentication) -> {
                                    response.setStatus(200);
                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );
                                    response.getWriter().write(
                                            "{\"success\":true," +
                                            "\"message\":\"Đăng nhập thành công\"}"
                                    );
                                }
                        )

                        .failureHandler(
                                (request, response, exception) -> {
                                    response.setStatus(401);
                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );
                                    response.getWriter().write(
                                            "{\"success\":false," +
                                            "\"message\":\"Sai tài khoản hoặc mật khẩu\"}"
                                    );
                                }
                        )

                        .permitAll()
                )

                .oauth2Login(oauth -> oauth

                        .successHandler(
                                (request, response, authentication) -> {
                                    try {
                                        Object principal =
                                                authentication.getPrincipal();

                                        if (!(principal instanceof OidcUser)) {
                                            throw new IllegalStateException(
                                                    "Google không trả về OIDC User"
                                            );
                                        }

                                        OidcUser oidcUser =
                                                (OidcUser) principal;

                                        User localUser =
                                                googleAccountService
                                                        .findOrCreateGoogleUser(
                                                                oidcUser
                                                        );

                                        UserDetails userDetails =
                                                userDetailsService
                                                        .loadUserByUsername(
                                                                localUser.getUsername()
                                                        );

                                        if (!userDetails.isEnabled()) {
                                            throw new IllegalStateException(
                                                    "Tài khoản đã bị khóa"
                                            );
                                        }

                                        Authentication localAuthentication =
                                                new UsernamePasswordAuthenticationToken(
                                                        userDetails,
                                                        null,
                                                        userDetails.getAuthorities()
                                                );

                                        SecurityContext securityContext =
                                                SecurityContextHolder
                                                        .createEmptyContext();

                                        securityContext.setAuthentication(
                                                localAuthentication
                                        );

                                        SecurityContextHolder.setContext(
                                                securityContext
                                        );

                                        contextRepository.saveContext(
                                                securityContext,
                                                request,
                                                response
                                        );

                                        response.sendRedirect(
                                                frontendUrl +
                                                "/login?google_login=success"
                                        );

                                    } catch (Exception exception) {
                                        SecurityContextHolder.clearContext();

                                        if (request.getSession(false) != null) {
                                            request.getSession(false)
                                                    .invalidate();
                                        }

                                        response.sendRedirect(
                                                frontendUrl +
                                                "/login?google_login=error"
                                        );
                                    }
                                }
                        )

                        .failureHandler(
                                (request, response, exception) -> {
                                    SecurityContextHolder.clearContext();

                                    if (request.getSession(false) != null) {
                                        request.getSession(false).invalidate();
                                    }

                                    response.sendRedirect(
                                            frontendUrl +
                                            "/login?google_login=error"
                                    );
                                }
                        )
                )

                .logout(logout -> logout

                        .logoutUrl(
                                "/api/auth/logout"
                        )

                        .invalidateHttpSession(true)
                        .clearAuthentication(true)

                        .deleteCookies(
                                "JSESSIONID",
                                "XSRF-TOKEN"
                        )

                        .logoutSuccessHandler(
                                (request, response, authentication) -> {
                                    SecurityContextHolder.clearContext();

                                    response.setStatus(200);
                                    response.setContentType(
                                            "application/json;charset=UTF-8"
                                    );
                                    response.getWriter().write(
                                            "{\"success\":true," +
                                            "\"message\":\"Đăng xuất thành công\"}"
                                    );
                                }
                        )

                        .permitAll()
                );

        return http.build();
    }
}
