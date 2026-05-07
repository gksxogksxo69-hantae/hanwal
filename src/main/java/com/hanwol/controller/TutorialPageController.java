package com.hanwol.controller;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class TutorialPageController {

    private final UserRepository userRepository;

    @GetMapping("/tutorial")
    public String tutorialPage(HttpServletRequest request) {
        HttpSession session = request.getSession(false);

        // 미로그인 시 메인으로 리다이렉트
        if (session == null || session.getAttribute("LOGIN_USER") == null) {
            return "redirect:/";
        }

        Long userId = (Long) session.getAttribute("LOGIN_USER");
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return "redirect:/";
        }

        // 이미 튜토리얼 완료한 유저는 마을로
        if (user.isTutorialCompleted() || user.getTutorialStep() >= 2) {
            return "redirect:/town";
        }

        return "tutorial";
    }
}
