package com.hanwol.controller;

import com.hanwol.service.QuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Map;

@RestController
@RequestMapping("/api/quest")
@RequiredArgsConstructor
public class QuestApiController {

    private final QuestService questService;
    private final UserRepository userRepository;

    private Long getUserIdOrThrow(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElse(null);
    }

    /**
     * 현재 진행 중인 퀘스트 정보 조회
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentQuest(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdOrThrow(userDetails);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        
        return ResponseEntity.ok(questService.getCurrentQuestInfo(userId));
    }

    /**
     * 퀘스트 보상 수령 요청
     */
    @PostMapping("/claim")
    public ResponseEntity<?> claimReward(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdOrThrow(userDetails);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        try {
            QuestService.QuestClaimResponse response = questService.claimReward(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
