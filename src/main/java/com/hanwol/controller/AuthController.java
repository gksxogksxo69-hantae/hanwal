package com.hanwol.controller;

import com.hanwol.domain.user.User;
import com.hanwol.dto.auth.AuthResponse;
import com.hanwol.dto.auth.LoginRequest;
import com.hanwol.dto.auth.RegisterRequest;
import com.hanwol.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
        try {
            authService.register(request);
            return ResponseEntity.ok(new AuthResponse(true, "회원가입이 완료되었습니다. 로그인해주세요."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/send-code")
    public ResponseEntity<AuthResponse> sendCode(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(new AuthResponse(false, "이메일을 입력해주세요."));
            }
            authService.sendVerificationCode(email);
            return ResponseEntity.ok(new AuthResponse(true, "발송 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/verify-code")
    public ResponseEntity<AuthResponse> verifyCode(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String code = body.get("code");
            authService.verifyEmailCode(email, code);
            return ResponseEntity.ok(new AuthResponse(true, "이메일 인증이 완료되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request, HttpServletRequest httpRequest) {
        try {
            User user = authService.login(request.getEmail(), request.getPassword());
            
            // 세션에 로그인 정보 저장
            HttpSession session = httpRequest.getSession();
            session.setAttribute("LOGIN_USER", user.getId());
            
            // 스프링 시큐리티 컨텍스트에 인증 정보 수동 설정 (이것이 없으면 403 에러 발생)
            org.springframework.security.core.userdetails.UserDetails userDetails = 
                org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password("")
                .roles("USER")
                .build();
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken authentication = 
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(authentication);
            session.setAttribute(org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, 
                org.springframework.security.core.context.SecurityContextHolder.getContext());
            
            // 성별이 아직 NULL 이면 캐릭터 선택 필요 상태로 응답
            boolean needsCharacterSetup = (user.getGender() == null);
            // 성별은 선택했지만 튜토리얼 미완료 상태
            boolean needsTutorial = !needsCharacterSetup && !user.isTutorialCompleted() && user.getTutorialStep() < 2;
            
            return ResponseEntity.ok(new AuthResponse(true, "로그인 성공", Map.of(
                    "nickname", user.getNickname(),
                    "needsCharacterSetup", needsCharacterSetup,
                    "needsTutorial", needsTutorial
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/find-id")
    public ResponseEntity<AuthResponse> findId(@RequestBody Map<String, String> body) {
        try {
            String nickname = body.get("nickname");
            String email = authService.findIdByNickname(nickname);
            return ResponseEntity.ok(new AuthResponse(true, "이메일을 찾았습니다.", email));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/find-pw")
    public ResponseEntity<AuthResponse> findPw(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String nickname = body.get("nickname");
            String tempPw = authService.resetPassword(email, nickname);
            return ResponseEntity.ok(new AuthResponse(true, "비밀번호가 재설정되었습니다.", tempPw));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/select-gender")
    public ResponseEntity<AuthResponse> selectGender(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        try {
            HttpSession session = httpRequest.getSession(false);
            if (session == null || session.getAttribute("LOGIN_USER") == null) {
                return ResponseEntity.status(401).body(new AuthResponse(false, "로그인이 필요합니다."));
            }
            Long userId = (Long) session.getAttribute("LOGIN_USER");
            String genderStr = body.get("gender");
            com.hanwol.domain.user.Gender gender = com.hanwol.domain.user.Gender.valueOf(genderStr.toUpperCase());
            
            authService.selectGender(userId, gender);
            
            return ResponseEntity.ok(new AuthResponse(true, "캐릭터(성별) 선택이 완료되었습니다. 강호에 오신 것을 환영합니다!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, "성별 선택에 실패했습니다: " + e.getMessage()));
        }
    }
}
