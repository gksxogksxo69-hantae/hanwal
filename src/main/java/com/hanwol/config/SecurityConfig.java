package com.hanwol.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // JSON API 통신을 위해 임시 비활성화
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/health", "/tutorial", "/css/**", "/images/**", "/js/**", "/api/auth/**", "/api/tutorial/**").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.disable()) // 기본 폼 로그인 비활성화 (커스텀 API로 로그인 처리)
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            );

        return http.build();
    }
}
