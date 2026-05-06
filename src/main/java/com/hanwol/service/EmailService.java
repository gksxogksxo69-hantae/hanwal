package com.hanwol.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@hanwol.com}")
    private String fromEmail;

    /**
     * 메일 전송 로직 (비동기로 실행되어 응답을 지연시키지 않음)
     */
    @Async
    public void sendVerificationEmail(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(Objects.requireNonNull(fromEmail));
            helper.setTo(Objects.requireNonNull(to));
            helper.setSubject(Objects.requireNonNull("[한월] 무림 출사(회원가입) 인증 번호 안내"));

            String htmlContent = buildHtmlContent(code);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("인증 이메일 발송 완료: {}", to);
        } catch (MessagingException e) {
            log.error("메일 발송 실패", e);
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
