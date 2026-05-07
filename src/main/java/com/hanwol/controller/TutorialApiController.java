package com.hanwol.controller;

import com.hanwol.domain.user.User;
import com.hanwol.dto.auth.AuthResponse;
import com.hanwol.service.TutorialService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/tutorial")
@RequiredArgsConstructor
public class TutorialApiController {

    private final TutorialService tutorialService;

    /**
     * 튜토리얼 진행 상태 조회
     */
    @GetMapping("/status")
    public ResponseEntity<AuthResponse> getStatus(HttpServletRequest request) {
        Long userId = getLoginUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(false, "로그인이 필요합니다."));
        }

        User user = tutorialService.getTutorialStatus(userId);
        return ResponseEntity.ok(new AuthResponse(true, "조회 성공", Map.of(
                "tutorialStep", user.getTutorialStep(),
                "tutorialCompleted", user.isTutorialCompleted(),
                "gender", user.getGender() != null ? user.getGender().name() : "MALE"
        )));
    }

    /**
     * 튜토리얼 단계 완료 처리
     */
    @PostMapping("/complete-step")
    public ResponseEntity<AuthResponse> completeStep(
            @RequestBody Map<String, Integer> body,
            HttpServletRequest request) {
        Long userId = getLoginUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(false, "로그인이 필요합니다."));
        }

        try {
            int step = body.getOrDefault("step", 0);
            tutorialService.completeStep(userId, step);
            return ResponseEntity.ok(new AuthResponse(true, "단계 완료 처리 성공"));
        } catch (Exception e) {
            log.error("튜토리얼 단계 완료 처리 실패", e);
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(false, "처리 실패: " + e.getMessage()));
        }
    }

    /**
     * 프롤로그 스킵
     */
    @PostMapping("/skip")
    public ResponseEntity<AuthResponse> skipPrologue(HttpServletRequest request) {
        Long userId = getLoginUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(false, "로그인이 필요합니다."));
        }

        try {
            tutorialService.skipPrologue(userId);
            return ResponseEntity.ok(new AuthResponse(true, "프롤로그 스킵 완료"));
        } catch (Exception e) {
            log.error("프롤로그 스킵 실패", e);
            return ResponseEntity.badRequest()
                    .body(new AuthResponse(false, "처리 실패: " + e.getMessage()));
        }
    }

    // 세션에서 로그인 유저 ID 추출
    private Long getLoginUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        Object userId = session.getAttribute("LOGIN_USER");
        return userId instanceof Long ? (Long) userId : null;
    }
}
