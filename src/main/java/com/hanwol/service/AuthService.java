package com.hanwol.service;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import com.hanwol.dto.auth.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    
    // 임시 이메일 인증 코드 및 인증 상태 저장소 (실무에서는 Redis 등 사용)
    private final Map<String, String> emailCodes = new ConcurrentHashMap<>();
    private final Map<String, Boolean> verifiedEmails = new ConcurrentHashMap<>();

    public String sendVerificationCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        // 6자리 난수 생성
        String code = String.format("%06d", (int)(Math.random() * 1000000));
        emailCodes.put(email, code);
        
        // 실제 이메일 발송
        emailService.sendVerificationEmail(email, code);
        
        return code;
    }

    public void verifyEmailCode(String email, String code) {
        String savedCode = emailCodes.get(email);
        if (savedCode == null || !savedCode.equals(code)) {
            throw new IllegalArgumentException("잘못된 인증코드거나 만료되었습니다.");
        }
        // 인증 성공 시 기록 남기고 코드는 삭제
        verifiedEmails.put(email, true);
        emailCodes.remove(email);
    }

    @Transactional
    public Long register(RegisterRequest request) {
        if (!Boolean.TRUE.equals(verifiedEmails.get(request.getEmail()))) {
            throw new IllegalArgumentException("이메일 인증이 완료되지 않았습니다.");
        }
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }
        if (userRepository.existsByNickname(request.getNickname())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .build();
                
        Long savedId = Objects.requireNonNull(userRepository.save(user).getId());
        verifiedEmails.remove(request.getEmail()); // 회원가입 완료 후 인증기록 삭제
        return savedId;
    }

    @Transactional(readOnly = true)
    public User login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 잘못되었습니다."));

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 잘못되었습니다.");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public String findIdByNickname(String nickname) {
        User user = userRepository.findByNickname(nickname)
                .orElseThrow(() -> new IllegalArgumentException("해당 닉네임의 모험가를 찾을 수 없습니다."));
        return user.getEmail();
    }

    @Transactional
    public String resetPassword(String email, String nickname) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 닉네임이 일치하지 않습니다."));

        if (!user.getNickname().equals(nickname)) {
            throw new IllegalArgumentException("이메일 또는 닉네임이 일치하지 않습니다.");
        }

        // 임시 비밀번호 발급 (8자리 랜덤)
        String tempPassword = UUID.randomUUID().toString().substring(0, 8);
        user.updatePassword(passwordEncoder.encode(tempPassword));

        return tempPassword;
    }

    @Transactional
    public void selectGender(Long userId, com.hanwol.domain.user.Gender gender) {
        User user = userRepository.findById(Objects.requireNonNull(userId))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
        user.selectGender(gender);
    }
}
