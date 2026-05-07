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
        return "<div style=\"max-width: 500px; margin: 0 auto; font-family: 'Gowun Batang', 'Batang', 'Gungsuh', serif; background-color: #111111; color: #e5e5e5; border: 2px solid #b45309; padding: 40px 30px; text-align: center; border-radius: 8px; box-shadow: inset 0 0 20px rgba(180, 83, 9, 0.2);\">"
             + "    <div style=\"font-size: 32px; font-weight: bold; color: #f59e0b; margin-bottom: 5px; letter-spacing: 8px;\">韓月</div>"
             + "    <div style=\"font-size: 14px; color: #d97706; margin-bottom: 30px; letter-spacing: 2px;\">- 한 월 -</div>"
             + "    <div style=\"width: 50px; height: 2px; background-color: #b45309; margin: 0 auto 30px;\"></div>"
             + "    <p style=\"font-size: 16px; line-height: 1.8; margin-bottom: 30px; color: #d1d5db;\">강호의 거친 바람을 헤치고 나아갈<br>새로운 모험가의 출사를 환영합니다.<br><br>아래의 <span style=\"color: #f59e0b; font-weight: bold;\">서신(인증번호)</span>을 확인하여<br>입성(가입)을 완료해 주십시오.</p>"
             + "    <div style=\"background-color: #1e1e1e; border: 1px solid #78350f; padding: 25px; margin: 0 auto 30px; max-width: 250px; border-radius: 4px;\">"
             + "        <span style=\"font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #fbbf24; letter-spacing: 12px; margin-left: 12px;\">" + code + "</span>"
             + "    </div>"
             + "    <p style=\"font-size: 12px; color: #6b7280; border-top: 1px dashed #3f3f46; padding-top: 20px;\">무림 연맹 서신국 (시스템 자동 발송)</p>"
             + "</div>";
    }
}
