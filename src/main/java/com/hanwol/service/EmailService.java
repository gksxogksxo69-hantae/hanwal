package com.hanwol.service;

import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${spring.mail.script-url}")
    private String scriptUrl;

    /**
     * 메일 전송 로직 (구글 앱스 스크립트 API 사용)
     */
    public void sendVerificationEmail(String to, String code) {
        try {
            String htmlContent = buildHtmlContent(code);
            String subject = "[한월] 무림 출사(회원가입) 인증 번호 안내";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of(
                    "to", to,
                    "subject", subject,
                    "htmlContent", htmlContent
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            String response = restTemplate.postForObject(Objects.requireNonNull(scriptUrl), request, String.class);
            log.info("인증 이메일 발송 완료 (Google Script): {}. Response: {}", to, response);
            
            if (response != null && response.contains("\"success\":false")) {
                throw new RuntimeException("구글 스크립트 내부 에러: " + response);
            }
        } catch (Exception e) {
            log.error("구글 스크립트 API 메일 발송 실패", e);
            throw new RuntimeException("이메일 발송 중 오류가 발생했습니다.");
        }
    }

    private String buildHtmlContent(String code) {
        return "<div style=\"font-family: 'Malgun Gothic', sans-serif; max-w-md; margin: 0 auto; padding: 30px; border: 1px solid #d97706; border-radius: 10px; background-color: #0f172a; color: #f3f4f6; text-align: center;\">"
                +
                "<h1 style=\"color: #f59e0b; margin-bottom: 20px;\">한월(韓月)</h1>" +
                "<p style=\"font-size: 16px; margin-bottom: 20px;\">강호에 입성할 준비가 되셨습니까?<br>아래 6자리 인증번호를 입력하여 출사를 완료해주세요.</p>"
                +
                "<div style=\"background-color: #1e293b; border: 2px dashed #fbbf24; padding: 20px; font-size: 28px; font-weight: bold; color: #fbbf24; letter-spacing: 5px; margin-bottom: 30px;\">"
                +
                code +
                "</div>" +
                "<p style=\"font-size: 12px; color: #9ca3af;\">본 메일은 한월 프로젝트 시스템에서 자동 발송되었습니다.</p>" +
                "</div>";
    }
}
